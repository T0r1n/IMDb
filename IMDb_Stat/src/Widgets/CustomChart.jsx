import {
  LineChart, BarChart, PieChart, ScatterChart,
  Line, Bar, Pie, Scatter,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import regression from 'regression';

const CHART_COLORS = ['#e50914', '#3b82f6', '#22c55e', '#f5c518', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const isPieChart = payload[0].payload?.status !== undefined;
  const value = payload[0].value;
  const name = isPieChart ? payload[0].payload.status : label;

  return (
    <div style={{
      background: '#09090b',
      border: '1px solid #2e2e35',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '13px',
      color: '#fafafa',
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    }}>
      <div style={{ color: '#71717a', fontSize: '11px', marginBottom: '4px' }}>{name}</div>
      <div style={{ fontWeight: 600 }}>
        {isPieChart ? `${payload[0].payload.percentage?.toFixed(2)}%` : value?.toLocaleString()}
      </div>
    </div>
  );
};

function CustomChart({ data = [], dataKey, xAxisKey, title, chartType, customFrontSize = 10, customInterval = 0 }) {
  if (!data.length) return null;

  let regressionLineData = null;
  if (chartType === 'scatter') {
    const regressionData = data.map(item => [item.numVotes, item.averageRating]).filter(d => d[0] != null && d[1] != null);
    if (regressionData.length > 1) {
      const result = regression.linear(regressionData);
      regressionLineData = result.points.map(point => ({ numVotes: point[0], averageRating: point[1] }));
    }
  }

  return (
    <div className="custom-chart">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        {chartType === 'line' && (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e2e35" />
            <XAxis dataKey={xAxisKey} tick={{ fill: '#71717a', fontSize: 12 }} tickLine={{ stroke: '#2e2e35' }} axisLine={{ stroke: '#2e2e35' }} />
            <YAxis tick={{ fill: '#71717a', fontSize: 12 }} tickLine={{ stroke: '#2e2e35' }} axisLine={{ stroke: '#2e2e35' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey={dataKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHART_COLORS[0] }} />
          </LineChart>
        )}

        {chartType === 'bar' && (
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e2e35" />
            <XAxis dataKey={xAxisKey} angle={-45} textAnchor="end" fontSize={customFrontSize} interval={customInterval} tick={{ fill: '#71717a' }} tickLine={{ stroke: '#2e2e35' }} axisLine={{ stroke: '#2e2e35' }} />
            <YAxis tick={{ fill: '#71717a', fontSize: 12 }} tickLine={{ stroke: '#2e2e35' }} axisLine={{ stroke: '#2e2e35' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        )}

        {chartType === 'pie' && (
          <PieChart>
            <Pie
              data={data}
              dataKey="percentage"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={100}
              stroke="#18181b"
              strokeWidth={3}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        )}

        {chartType === 'scatter' && (
          <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid stroke="#2e2e35" />
            <XAxis dataKey="numVotes" name="Votes" tick={{ fill: '#71717a', fontSize: 12 }} tickLine={{ stroke: '#2e2e35' }} axisLine={{ stroke: '#2e2e35' }} />
            <YAxis dataKey="averageRating" name="Rating" domain={[0, 10]} tick={{ fill: '#71717a', fontSize: 12 }} tickLine={{ stroke: '#2e2e35' }} axisLine={{ stroke: '#2e2e35' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#2e2e35' }} />
            <Scatter name="Correlation" data={data} fill={CHART_COLORS[0]} fillOpacity={0.6} r={4} />
            {regressionLineData && (
              <Line type="monotone" data={regressionLineData} dataKey="averageRating" stroke={CHART_COLORS[3]} strokeWidth={2} dot={false} />
            )}
          </ScatterChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default CustomChart;
