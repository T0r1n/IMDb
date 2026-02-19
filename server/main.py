from datetime import datetime
import os
import threading
import time
import kaggle
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import schedule
try:
    import requests
except ImportError:
    requests = None
    print("⚠️ Библиотека requests не установлена. Установите: pip install requests")

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, confusion_matrix, ConfusionMatrixDisplay
import joblib

app = Flask(__name__)
cors = CORS(app, origins='*')

# Папка фронта (Vite): раздаём собранный билд из dist/
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'IMDb_Stat')
DIST_DIR = os.path.join(FRONTEND_DIR, 'dist')

# kaggle.api.authenticate()
# kaggle.api.dataset_download_files('octopusteam/full-imdb-dataset', path=".", unzip=True)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Корень проекта
file_path = os.path.join(BASE_DIR, 'data.csv')


def run_schedule():
    print("Запуск планировщика задач...")
    while True:
        schedule.run_pending()
        time.sleep(10)


def job():
    global file_path
    # kaggle.api.authenticate()
    # kaggle.api.dataset_download_files('octopusteam/full-imdb-dataset', path=".", unzip=True)
    file_path = 'data.csv'


schedule.every().minute.at(":01").do(job)


model_file = 'movie_rating_model.pkl'


def train_model():
    data = pd.read_csv('data.csv')

    X = data[['releaseYear', 'genres', 'numVotes']]
    y = data['averageRating']

    print("Форма X:", X.shape)
    print("Форма y:", y.shape)

    preprocessor = ColumnTransformer(
        transformers=[
            ('genre', OneHotEncoder(), 'genres')
        ],
        remainder='passthrough'
    )
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor())
    ])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model.fit(X_train, y_train)
    joblib.dump(model, model_file)


def predict_movie_rating(year, genre, voteRange):
    min_votes, max_votes = map(int, voteRange.split('-'))
    data = pd.read_csv('data.csv')

    # Фильтрация данных по году
    filtered_data = data[data['releaseYear'] == int(year)]

    # Фильтрация данных по жанру
    filtered_data = filtered_data[filtered_data['genres'].str.contains(genre, case=False, na=False)]

    # Фильтрация данных по количеству оценок
    filtered_data = filtered_data[(filtered_data['numVotes'] >= min_votes) & (filtered_data['numVotes'] <= max_votes)]

    if not filtered_data.empty:
        # Рассчет средней оценки для отфильтрованных данных
        average_rating = filtered_data['averageRating'].mean()

        # Рассчет погрешности
        rating_std = filtered_data['averageRating'].std()  # Стандартное отклонение
        predictions = filtered_data['averageRating'].values  # Получаем реальные оценки
        mae = mean_absolute_error(predictions, [average_rating] * len(predictions))  # Абсолютная погрешность

        return {
            'averageRating': round(average_rating, 2),
            'errorMargin': round(rating_std, 2),
            'mae': round(mae, 2)
        }

    historical_data = data[data['releaseYear'] < int(year)]
    historical_data = historical_data[historical_data['genres'].str.contains(genre, case=False, na=False)]
    historical_data = historical_data[(historical_data['numVotes'] >= min_votes) & (historical_data['numVotes'] <= max_votes)]

    if not historical_data.empty:
        average_rating = historical_data['averageRating'].mean()
        rating_std = historical_data['averageRating'].std()  # Стандартное отклонение
        predictions = historical_data['averageRating'].values  # Получаем реальные оценки
        mae = mean_absolute_error(predictions, [average_rating] * len(predictions))  # Абсолютная погрешность

        return {
            'averageRating': round(average_rating, 2),
            'errorMargin': round(rating_std, 2),
            'mae': round(mae, 2)
        }
    return None



@app.route('/', methods=['GET'])
def index():
    if os.path.isdir(DIST_DIR):
        return send_from_directory(DIST_DIR, 'index.html')
    return (
        '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem">'
        '<h1>IMDb Stat</h1><p>Фронт на Vite. Варианты:</p>'
        '<ul><li><b>Dev:</b> в папке IMDb_Stat выполните <code>npm run dev</code>, откройте '
        '<a href="http://localhost:5173">http://localhost:5173</a></li>'
        '<li><b>Prod:</b> в папке IMDb_Stat выполните <code>npm run build</code>, затем перезапустите сервер</li></ul>'
        '</body></html>',
        200,
        {'Content-Type': 'text/html; charset=utf-8'},
    )


@app.route('/<path:path>', methods=['GET'])
def serve_frontend(path):
    """Раздача собранного Vite-фронта из dist/ (JS, CSS, assets)."""
    if not os.path.isdir(DIST_DIR):
        return jsonify(error='Frontend not built. Run: cd IMDb_Stat && npm run build'), 404
    return send_from_directory(DIST_DIR, path)


@app.route('/data', methods=['GET'])
def get_data():
    data = pd.read_csv(file_path)
    count = len(data)

    return jsonify({'countall': count})
    # return jsonify(data.head(5000).to_dict(orient='records'))


@app.route('/filtered_data', methods=['GET'])
def get_filtered_data():
    data = pd.read_csv(file_path)

    filtered_data = data.dropna(subset=['genres', 'averageRating', 'numVotes'])

    count = len(filtered_data)

    return jsonify({'count:': count})


@app.route('/top_rated_by_genre', methods=['GET'])
def get_top_rated_by_genre():
    print(f"\n=== /top_rated_by_genre: Загрузка данных из {file_path} ===")
    data = pd.read_csv(file_path)
    print(f"Всего строк в файле: {len(data)}")
    print(f"Колонки: {list(data.columns)}")

    filtered_data = data.dropna(subset=['genres', 'averageRating', 'numVotes'])
    print(f"После удаления NaN: {len(filtered_data)} строк")

    filtered_data = filtered_data[filtered_data['numVotes'] > 500]
    print(f"После фильтрации по numVotes > 500: {len(filtered_data)} строк")

    # Сохраняем оригинальные жанры для каждого фильма
    filtered_data['genres_list'] = filtered_data['genres'].str.split(',').apply(lambda x: [g.strip() for g in x])

    genres_expanded = filtered_data.assign(genres=filtered_data['genres'].str.split(',')).explode('genres')

    genres_expanded['genres'] = genres_expanded['genres'].str.strip()

    sorted_data = genres_expanded.sort_values(by='averageRating', ascending=False)

    top_rated_by_genre = sorted_data.groupby('genres').head(9)

    result = {}
    for genre in top_rated_by_genre['genres'].unique():
        films = top_rated_by_genre[top_rated_by_genre['genres'] == genre]

        films_grouped = films.groupby('title').agg({
            'averageRating': 'first',
            'numVotes': 'first',
            'id': 'first'
        }).reset_index()

        films_grouped = films_grouped.sort_values(by='averageRating', ascending=False)
        if genre not in result:
            result[genre] = []

        for _, row in films_grouped.iterrows():
            # Получаем оригинальные жанры из исходных данных
            movie_id = row['id']
            original_movie = filtered_data[filtered_data['id'] == movie_id]
            if not original_movie.empty:
                genres_list = original_movie.iloc[0]['genres_list']
                if not isinstance(genres_list, list):
                    genres_list = [genres_list] if genres_list else []
            else:
                genres_list = [genre]  # Fallback на текущий жанр
            
            result[genre].append({
                'id': str(row['id']),  # Убеждаемся, что id - строка
                'title': str(row['title']),
                'averageRating': float(row['averageRating']),
                'numVotes': int(row['numVotes']),
                'genres': genres_list
            })

    print(f"\n=== Результат /top_rated_by_genre ===")
    print(f"Найдено жанров: {len(result)}")
    for genre, films in result.items():
        print(f"  {genre}: {len(films)} фильмов")
        if films:
            print(f"    Пример: {films[0]['title']} (рейтинг: {films[0]['averageRating']}, голосов: {films[0]['numVotes']})")
    print("=" * 50 + "\n")

    return jsonify(result)


@app.route('/average_rating_per_year', methods=['GET'])
def average_rating_per_year():
    data = pd.read_csv(file_path)

    data = data.dropna(subset=['releaseYear', 'averageRating'])

    data['releaseYear'] = pd.to_numeric(data['releaseYear'], errors='coerce')

    current_year = datetime.now().year

    data = data[data['releaseYear'] <= current_year]

    result = data.groupby('releaseYear')['averageRating'].mean().reset_index()
    result['averageRating'] = result['averageRating'].round(2)

    return jsonify(result.to_dict(orient='records'))


@app.route('/genre_distribution', methods=['GET'])
def genre_distribution():
    data = pd.read_csv(file_path)

    data = data.dropna(subset=['genres'])

    genres_expanded = data.assign(genres=data['genres'].str.split(',')).explode('genres')
    genres_expanded['genres'] = genres_expanded['genres'].str.strip()

    genre_counts = genres_expanded['genres'].value_counts().reset_index()
    genre_counts.columns = ['genre', 'count']

    total_count = genre_counts['count'].sum()
    genre_counts['percentage'] = (genre_counts['count'] / total_count * 100).round(2)

    return jsonify(genre_counts.to_dict(orient='records'))


@app.route('/votes_per_year', methods=['GET'])
def get_votes_per_year():
    data = pd.read_csv(file_path)

    data = data.dropna(subset=['releaseYear', 'numVotes'])

    data['releaseYear'] = pd.to_numeric(data['releaseYear'], errors='coerce')

    result = data.groupby('releaseYear')['numVotes'].sum().reset_index()
    result.columns = ['year', 'totalVotes']

    return jsonify(result.to_dict(orient='records'))


@app.route('/rating_distribution', methods=['GET'])
def rating_distribution():
    data = pd.read_csv(file_path)

    data = data.dropna(subset=['averageRating'])

    bins = [0, 2, 4, 6, 8, 10]
    labels = ['0-2', '2-4', '4-6', '6-8', '8-10']

    data['rating_range'] = pd.cut(data['averageRating'], bins=bins, labels=labels, right=False)

    distribution = data['rating_range'].value_counts().sort_index()

    result = distribution.reset_index()
    result.columns = ['rating_range', 'count']

    return jsonify(result.to_dict(orient='records'))


@app.route('/votes_rating_correlation', methods=['GET'])
def votes_rating_correlation():
    data = pd.read_csv(file_path)

    data = data.dropna(subset=['averageRating', 'numVotes'])

    limited_data = data.sample(n=500, random_state=1)

    correlation_data = limited_data[['numVotes', 'averageRating']]

    correlation_coefficient = correlation_data['numVotes'].corr(correlation_data['averageRating'])

    result = {
        'correlation_coefficient': correlation_coefficient,
        'data': correlation_data.to_dict(orient='records')
    }

    return jsonify(result)


@app.route('/average_rating_by_genre', methods=['GET'])
def average_rating_by_genre():
    data = pd.read_csv(file_path)

    data = data.dropna(subset=['genres', 'averageRating'])

    genres_expanded = data.assign(genres=data['genres'].str.split(',')).explode('genres')
    genres_expanded['genres'] = genres_expanded['genres'].str.strip()

    average_ratings = genres_expanded.groupby('genres')['averageRating'].mean().reset_index()
    average_ratings['averageRating'] = average_ratings['averageRating'].round(2)

    return jsonify(average_ratings.to_dict(orient='records'))


@app.route('/movies_per_year', methods=['GET'])
def movies_per_year():
    data = pd.read_csv(file_path)

    data = data.dropna(subset=['releaseYear'])

    data['releaseYear'] = pd.to_numeric(data['releaseYear'], errors='coerce')

    result = data.groupby('releaseYear').size().reset_index(name='count')

    return jsonify(result.to_dict(orient='records'))


@app.route('/top_20_movies', methods=['GET'])
def get_top_20_movies():
    data = pd.read_csv(file_path)

    filtered_data = data.dropna(subset=['title', 'averageRating', 'numVotes'])

    filtered_data = filtered_data[filtered_data['numVotes'] >= 500]

    top_20_movies = filtered_data.sort_values(by='averageRating', ascending=False).head(20)

    result = top_20_movies[['title', 'averageRating', 'genres']].to_dict(orient='records')

    return jsonify(result)


@app.route('/data_missing', methods=['GET'])
def data_missing():
    data = pd.read_csv(file_path)

    total_count = len(data)

    missing_data_count = data.isnull().any(axis=1).sum()
    complete_count = total_count - missing_data_count

    missing_percentage = (missing_data_count / total_count) * 100 if total_count > 0 else 0
    complete_percentage = (complete_count / total_count) * 100 if total_count > 0 else 0

    result = {
        'total_count': int(total_count),
        'data': [
            {
                'status': 'Complete Data',
                'count': int(complete_count),
                'percentage': round(complete_percentage, 2)
            },
            {
                'status': 'Missing Data',
                'count': int(missing_data_count),
                'percentage': round(missing_percentage, 2)
            }
        ]
    }

    return jsonify(result)


@app.route('/predict_rating', methods=['POST'])
def predict_rating():
    data = request.get_json()
    year = data['year']
    genre = data['genre']
    voteRange = data['voteRange']

    result = predict_movie_rating(year, genre, voteRange)

    if result is None:
        return jsonify({'error': 'Нет данных для прогнозирования'}), 404

    return jsonify(result)


@app.route('/get_poster/<movie_id>', methods=['GET'])
def get_poster(movie_id):
    """Получение URL постера фильма через OMDb API."""
    # OMDb API ключ (можно получить бесплатно на http://www.omdbapi.com/apikey.aspx)
    # Используем переменную окружения или ключ по умолчанию
    omdb_api_key = os.environ.get('OMDB_API_KEY', '931b157c')
    
    # Используем OMDb API для получения постеров
    if omdb_api_key and requests:
        try:
            url = f"http://www.omdbapi.com/?apikey={omdb_api_key}&i={movie_id}"
            print(f"Запрос постера для {movie_id}: {url}")
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"Ответ OMDb API для {movie_id}: Response={data.get('Response')}, Poster={data.get('Poster', 'N/A')[:50]}...")
                
                if data.get('Response') == 'True' and data.get('Poster'):
                    poster_url = data['Poster']
                    if poster_url and poster_url != 'N/A':
                        print(f"✅ Успешно получен постер для {movie_id}: {poster_url[:80]}...")
                        return jsonify({
                            'poster_url': poster_url,
                            'success': True,
                            'movie_id': movie_id,
                            'title': data.get('Title', ''),
                            'year': data.get('Year', '')
                        })
                    else:
                        print(f"⚠️ Постер для {movie_id} недоступен (N/A)")
                else:
                    print(f"⚠️ OMDb API вернул ошибку для {movie_id}: {data.get('Error', 'Unknown error')}")
            else:
                print(f"❌ HTTP ошибка {response.status_code} при запросе постера для {movie_id}")
        except Exception as e:
            print(f"❌ Ошибка при получении постера из OMDb для {movie_id}: {e}")
    elif not requests:
        print("⚠️ Библиотека requests не установлена. Установите: pip install requests")
    else:
        print("⚠️ OMDb API ключ не настроен")
    
    # Fallback 1: Пробуем прямой URL IMDb (формат может отличаться)
    # IMDb ID обычно имеет формат tt1234567
    if movie_id.startswith('tt'):
        # Пробуем несколько вариантов URL
        imdb_urls = [
            f"https://m.media-amazon.com/images/M/MV5B{movie_id}._V1_SX300.jpg",
            f"https://ia.media-imdb.com/images/M/MV5B{movie_id}._V1_SX300.jpg",
        ]
    else:
        # Если ID не в формате tt, пробуем как есть
        imdb_urls = [
            f"https://m.media-amazon.com/images/M/MV5B{movie_id}._V1_SX300.jpg",
        ]
    
    # Fallback 2: Используем TMDB API (требует ключ, но можно попробовать без него)
    try:
        # Пробуем получить через TMDB без ключа (может не работать)
        tmdb_url = f"https://api.themoviedb.org/3/find/{movie_id}?external_source=imdb_id"
        # Это не сработает без ключа, но оставим для будущего использования
    except:
        pass
    
    # Fallback 3: Placeholder с градиентом
    colors = ['667eea', '764ba2', 'f093fb', '4facfe', '00f2fe', '43e97b', 'fa709a']
    color_index = abs(hash(movie_id)) % len(colors)
    placeholder_url = f"https://via.placeholder.com/300x400/{colors[color_index]}/ffffff?text=🎬"
    
    return jsonify({
        'poster_url': imdb_urls[0] if imdb_urls else placeholder_url,
        'fallback_urls': imdb_urls[1:] if len(imdb_urls) > 1 else [],
        'placeholder_url': placeholder_url,
        'success': False,
        'movie_id': movie_id,
        'message': 'Используйте OMDb API ключ для получения реальных постеров. Получите бесплатный ключ на http://www.omdbapi.com/apikey.aspx'
    })


@app.route('/get_movies_by_local_genres', methods=['POST'])
def get_movies_by_local_genres():
    print(f"\n=== /get_movies_by_local_genres: Загрузка данных из {file_path} ===")
    data = pd.read_csv(file_path)
    genres = request.json.get('genres', [])
    
    print(f"Запрошенные жанры: {genres}")
    print(f"Всего строк в файле: {len(data)}")

    if not genres:
        print("ОШИБКА: Жанры не предоставлены")
        return jsonify({'error': 'No genres provided'}), 400

    filtered_data = data.dropna(subset=['genres', 'averageRating', 'numVotes'])
    print(f"После удаления NaN: {len(filtered_data)} строк")

    filtered_data = filtered_data[filtered_data['numVotes'] > 500]
    print(f"После фильтрации по numVotes > 500: {len(filtered_data)} строк")

    # Сохраняем оригинальные жанры как список
    filtered_data['genres_list'] = filtered_data['genres'].str.split(',').apply(lambda x: [g.strip() for g in x])

    genres_expanded = filtered_data.assign(genres=filtered_data['genres'].str.split(',')).explode('genres')
    genres_expanded['genres'] = genres_expanded['genres'].str.strip()

    filtered_by_genres = genres_expanded[genres_expanded['genres'].isin(genres)]
    print(f"После фильтрации по жанрам {genres}: {len(filtered_by_genres)} строк")

    if filtered_by_genres.empty:
        print("РЕЗУЛЬТАТ: Фильмы не найдены, возвращаем пустой массив")
        print("=" * 50 + "\n")
        return jsonify([]), 200  # Возвращаем пустой массив вместо ошибки

    # Получаем уникальные фильмы (по id или title)
    unique_movies = filtered_by_genres.drop_duplicates(subset=['id'], keep='first')
    print(f"Уникальных фильмов: {len(unique_movies)}")
    
    # Если фильмов больше 20, выбираем случайные
    if len(unique_movies) > 20:
        random_movies = unique_movies.sample(n=20, random_state=1)
        print(f"Выбрано случайных фильмов: {len(random_movies)}")
    else:
        random_movies = unique_movies
        print(f"Используются все найденные фильмы: {len(random_movies)}")

    # Группируем по id чтобы получить все жанры фильма
    movies_result = []
    for movie_id in random_movies['id'].unique():
        movie_data = filtered_data[filtered_data['id'] == movie_id].iloc[0]
        movies_result.append({
            'id': movie_data['id'],
            'title': movie_data['title'],
            'averageRating': float(movie_data['averageRating']),
            'numVotes': int(movie_data['numVotes']),
            'genres': movie_data['genres_list'] if isinstance(movie_data['genres_list'], list) else [movie_data['genres_list']]
        })

    print(f"\n=== Результат /get_movies_by_local_genres ===")
    print(f"Возвращается фильмов: {len(movies_result)}")
    for i, movie in enumerate(movies_result[:5], 1):  # Показываем первые 5
        print(f"  {i}. {movie['title']} (ID: {movie['id']}, рейтинг: {movie['averageRating']}, голосов: {movie['numVotes']}, жанры: {movie['genres']})")
    if len(movies_result) > 5:
        print(f"  ... и еще {len(movies_result) - 5} фильмов")
    print("=" * 50 + "\n")

    return jsonify(movies_result)


if __name__ == '__main__':
    threading.Thread(target=run_schedule).start()
    app.run(debug=True)
