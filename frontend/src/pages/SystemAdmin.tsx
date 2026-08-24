import { useEffect, useState } from 'react';
import { Card, Button, Typography, Row, Col, Tag, Statistic, Space, Popconfirm, message, Badge, Divider, Table, Progress, Collapse } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  ClockCircleOutlined,
  ApiOutlined,
  GlobalOutlined,
  DesktopOutlined,
  FileTextOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import api from '../api/client';

interface HealthData {
  status: string;
  database: { connected: boolean; latencyMs: number; type: string; database: string };
  server: { uptime: number; memory: number; nodeVersion: string };
  timestamp: string;
}

interface TableStat {
  key: string;
  table: string;
  label: string;
  count: number;
}

const clearableKeys = ['downtime', 'maintenance', 'transfers', 'spareParts', 'rental'];

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export default function SystemAdmin() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [tables, setTables] = useState<TableStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);
  const [apiChecks, setApiChecks] = useState<{ endpoint: string; status: string; ms: number }[]>([]);
  const [checking, setChecking] = useState(false);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [dbDetails, setDbDetails] = useState<any>(null);
  const [network, setNetwork] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const loadHealth = async () => {
    try {
      const res = await api.get('/system/health');
      setHealth(res.data);
    } catch {
      setHealth(null);
    }
  };

  const loadTables = async () => {
    try {
      const res = await api.get('/system/table-stats');
      setTables(res.data);
    } catch {
      setTables([]);
    }
    setLoading(false);
  };

  const loadServerInfo = async () => {
    try {
      const res = await api.get('/system/server-info');
      setServerInfo(res.data);
    } catch {}
  };

  const loadDbDetails = async () => {
    try {
      const res = await api.get('/system/db-details');
      setDbDetails(res.data);
    } catch {}
  };

  const loadNetwork = async () => {
    try {
      const res = await api.get('/system/network');
      setNetwork(res.data);
    } catch {}
  };

  const loadLogs = async () => {
    try {
      const res = await api.get('/system/logs');
      setLogs(res.data);
    } catch {}
  };

  const refresh = () => {
    setLoading(true);
    loadHealth();
    loadTables();
    loadServerInfo();
    loadDbDetails();
    loadNetwork();
    loadLogs();
  };

  useEffect(() => { refresh(); }, []);

  const handleClear = async (key: string) => {
    setClearing(key);
    try {
      const res = await api.delete(`/system/clear/${key}`);
      message.success(`Cleared ${res.data.deleted} records from ${key}`);
      loadTables();
    } catch {
      message.error(`Failed to clear ${key}`);
    }
    setClearing(null);
  };

  const runApiChecks = async () => {
    setChecking(true);
    const endpoints = [
      { endpoint: 'GET /api/machines', url: '/machines' },
      { endpoint: 'GET /api/downtime', url: '/downtime' },
      { endpoint: 'GET /api/maintenance', url: '/maintenance' },
      { endpoint: 'GET /api/transfers', url: '/transfers' },
      { endpoint: 'GET /api/spare-parts', url: '/spare-parts' },
      { endpoint: 'GET /api/rental', url: '/rental' },
      { endpoint: 'GET /api/users', url: '/users' },
      { endpoint: 'GET /api/dashboard', url: '/dashboard' },
      { endpoint: 'GET /api/downtime/active', url: '/downtime/active' },
      { endpoint: 'GET /api/users/mechanics', url: '/users/mechanics' },
      { endpoint: 'GET /api/system/health', url: '/system/health' },
      { endpoint: 'GET /api/system/table-stats', url: '/system/table-stats' },
      { endpoint: 'GET /api/system/server-info', url: '/system/server-info' },
      { endpoint: 'GET /api/system/db-details', url: '/system/db-details' },
    ];

    const results = [];
    for (const ep of endpoints) {
      const start = Date.now();
      try {
        await api.get(ep.url);
        results.push({ endpoint: ep.endpoint, status: 'ok', ms: Date.now() - start });
      } catch (e: any) {
        results.push({ endpoint: ep.endpoint, status: `error: ${e.response?.status || 'network'}`, ms: Date.now() - start });
      }
    }
    setApiChecks(results);
    setChecking(false);
  };

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <CloudServerOutlined style={{ marginRight: 8 }} />
            System Administration
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Server, Database, Network, API & Data Management</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>Refresh All</Button>
      </div>

      {/* ===== SYSTEM OVERVIEW ===== */}
      <Card size="small" title={<><DashboardOutlined style={{ marginRight: 6 }} />System Overview</>} style={{ marginBottom: 16 }}>
        {health ? (
          <Row gutter={[16, 12]}>
            <Col xs={12} sm={6}>
              <Statistic
                title="Status"
                value={health.status.toUpperCase()}
                valueStyle={{ color: health.status === 'ok' ? '#52c41a' : '#ff4d4f', fontSize: 18 }}
                prefix={health.status === 'ok' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="DB Latency" value={health.database.latencyMs} suffix="ms" valueStyle={{ fontSize: 18 }} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Uptime" value={formatUptime(health.server.uptime)} valueStyle={{ fontSize: 16 }} prefix={<ClockCircleOutlined />} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Heap Memory" value={health.server.memory} suffix="MB" valueStyle={{ fontSize: 18 }} />
            </Col>
            <Col xs={24}>
              <Space size={16} wrap style={{ fontSize: 12, color: '#8c8c8c' }}>
                <span>DB: {health.database.type} / {health.database.database}</span>
                <span>Node: {health.server.nodeVersion}</span>
                <span>Last check: {new Date(health.timestamp).toLocaleTimeString()}</span>
              </Space>
            </Col>
          </Row>
        ) : (
          <Typography.Text type="danger"><CloseCircleOutlined /> Cannot reach server</Typography.Text>
        )}
      </Card>

      {/* ===== APP SERVER INFO ===== */}
      <Card size="small" title={<><DesktopOutlined style={{ marginRight: 6 }} />App Server Details</>} style={{ marginBottom: 16 }}>
        {serverInfo ? (
          <>
            <Row gutter={[16, 12]}>
              <Col xs={12} sm={8}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Hostname</Typography.Text>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{serverInfo.hostname}</div>
              </Col>
              <Col xs={12} sm={8}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Platform / Arch</Typography.Text>
                <div style={{ fontSize: 13 }}>{serverInfo.platform} / {serverInfo.arch}</div>
              </Col>
              <Col xs={12} sm={8}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>OS Release</Typography.Text>
                <div style={{ fontSize: 13 }}>{serverInfo.osRelease}</div>
              </Col>
              <Col xs={24} sm={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>CPU</Typography.Text>
                <div style={{ fontSize: 12 }}>{serverInfo.cpuModel}</div>
                <Tag style={{ marginTop: 4 }}>{serverInfo.cpuCores} Cores</Tag>
              </Col>
              <Col xs={24} sm={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Load Average</Typography.Text>
                <div style={{ fontSize: 13 }}>
                  <Tag>{serverInfo.loadAverage['1m']} (1m)</Tag>
                  <Tag>{serverInfo.loadAverage['5m']} (5m)</Tag>
                  <Tag>{serverInfo.loadAverage['15m']} (15m)</Tag>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }} />

            <Row gutter={[16, 12]}>
              <Col xs={24} sm={8}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>RAM Usage</Typography.Text>
                <Progress percent={serverInfo.usedMemoryPercent} size="small" status={serverInfo.usedMemoryPercent > 90 ? 'exception' : 'active'} />
                <Typography.Text style={{ fontSize: 11 }}>{(serverInfo.totalMemoryGB - serverInfo.freeMemoryGB).toFixed(1)} / {serverInfo.totalMemoryGB} GB</Typography.Text>
              </Col>
              <Col xs={24} sm={8}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Disk Usage</Typography.Text>
                <Progress percent={serverInfo.disk.usedPercent} size="small" status={serverInfo.disk.usedPercent > 90 ? 'exception' : 'active'} />
                <Typography.Text style={{ fontSize: 11 }}>{serverInfo.disk.used} / {serverInfo.disk.total} GB</Typography.Text>
              </Col>
              <Col xs={24} sm={8}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Node.js Process</Typography.Text>
                <div style={{ fontSize: 12 }}>
                  <div>PID: <Tag style={{ margin: 0 }}>{serverInfo.process.pid}</Tag></div>
                  <div style={{ marginTop: 4 }}>RSS: {serverInfo.process.rssMB} MB | Heap: {serverInfo.process.heapUsedMB}/{serverInfo.process.heapTotalMB} MB</div>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }} />
            <Space size={16} wrap style={{ fontSize: 12, color: '#8c8c8c' }}>
              <span>Node: {serverInfo.nodeVersion}</span>
              <span>Env: <Tag color={serverInfo.env === 'production' ? 'green' : 'orange'} style={{ margin: 0 }}>{serverInfo.env}</Tag></span>
            </Space>
          </>
        ) : (
          <Typography.Text type="secondary">Loading...</Typography.Text>
        )}
      </Card>

      {/* ===== DATABASE DETAILS ===== */}
      <Card size="small" title={<><DatabaseOutlined style={{ marginRight: 6 }} />Database Details</>} style={{ marginBottom: 16 }}>
        {dbDetails ? (
          <>
            <Row gutter={[16, 12]}>
              <Col xs={12} sm={6}>
                <Statistic title="DB Size" value={dbDetails.databaseSize} valueStyle={{ fontSize: 16 }} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="Connections" value={dbDetails.connections?.total || 0} valueStyle={{ fontSize: 16 }} suffix={`/ ${dbDetails.maxConnections}`} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="Active Queries" value={dbDetails.connections?.active || 0} valueStyle={{ fontSize: 16, color: '#1677ff' }} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="Cache Hit Ratio" value={dbDetails.cacheHitRatio || 0} suffix="%" valueStyle={{ fontSize: 16, color: (dbDetails.cacheHitRatio || 0) > 95 ? '#52c41a' : '#faad14' }} />
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }} />

            <Row gutter={[16, 8]}>
              <Col xs={24} sm={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>PostgreSQL Version</Typography.Text>
                <div style={{ fontSize: 11, wordBreak: 'break-all' }}>{dbDetails.pgVersion}</div>
              </Col>
              <Col xs={24} sm={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Connection Info</Typography.Text>
                <div style={{ fontSize: 12 }}>
                  <Tag color="blue">{dbDetails.connectionInfo?.host}:{dbDetails.connectionInfo?.port}</Tag>
                  <Tag>{dbDetails.connectionInfo?.database}</Tag>
                </div>
              </Col>
            </Row>

            {dbDetails.tableSizes?.length > 0 && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Typography.Text strong style={{ fontSize: 12 }}>Table Sizes</Typography.Text>
                <Table
                  dataSource={dbDetails.tableSizes}
                  rowKey="table"
                  size="small"
                  pagination={false}
                  style={{ marginTop: 8 }}
                  columns={[
                    { title: 'Table', dataIndex: 'table', key: 'table', render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</span> },
                    { title: 'Total Size', dataIndex: 'total_size', key: 'total_size' },
                    { title: 'Data', dataIndex: 'data_size', key: 'data_size' },
                    { title: 'Indexes', dataIndex: 'index_size', key: 'index_size' },
                  ]}
                />
              </>
            )}
          </>
        ) : (
          <Typography.Text type="secondary">Loading...</Typography.Text>
        )}
      </Card>

      {/* ===== NETWORK & CONNECTIVITY ===== */}
      <Card size="small" title={<><GlobalOutlined style={{ marginRight: 6 }} />Network & Connectivity</>} style={{ marginBottom: 16 }}>
        {network ? (
          <>
            <Typography.Text strong style={{ fontSize: 12 }}>Connectivity Checks</Typography.Text>
            <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
              {network.checks?.map((c: any) => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: c.status === 'ok' ? '#f6ffed' : '#fff2f0', borderRadius: 4, fontSize: 13 }}>
                  <span>{c.name} <Typography.Text type="secondary" style={{ fontSize: 11 }}>({c.host})</Typography.Text></span>
                  <Space size={8}>
                    <span style={{ color: '#8c8c8c', fontSize: 11 }}>{c.latencyMs}ms</span>
                    {c.status === 'ok' ? <Tag color="success" style={{ margin: 0 }}>OK</Tag> : <Tag color="error" style={{ margin: 0 }}>FAIL</Tag>}
                  </Space>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: network.dnsResolution ? '#f6ffed' : '#fff2f0', borderRadius: 4, fontSize: 13 }}>
                <span>DNS Resolution <Typography.Text type="secondary" style={{ fontSize: 11 }}>(google.com)</Typography.Text></span>
                {network.dnsResolution ? <Tag color="success" style={{ margin: 0 }}>OK</Tag> : <Tag color="error" style={{ margin: 0 }}>FAIL</Tag>}
              </div>
            </div>

            {network.networkInterfaces?.length > 0 && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Typography.Text strong style={{ fontSize: 12 }}>Network Interfaces</Typography.Text>
                <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                  {network.networkInterfaces.map((ni: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '4px 10px', background: '#fafafa', borderRadius: 4, fontSize: 12, flexWrap: 'wrap' }}>
                      <Tag style={{ margin: 0 }}>{ni.name}</Tag>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ni.ip}</span>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>MAC: {ni.mac}</Typography.Text>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <Typography.Text type="secondary">Loading...</Typography.Text>
        )}
      </Card>

      {/* ===== API ENDPOINT CHECKS ===== */}
      <Card
        size="small"
        title={<><ApiOutlined style={{ marginRight: 6 }} />API Endpoints ({apiChecks.length ? `${apiChecks.filter(c => c.status === 'ok').length}/${apiChecks.length} OK` : 'Not checked'})</>}
        extra={<Button size="small" onClick={runApiChecks} loading={checking}>Run Checks</Button>}
        style={{ marginBottom: 16 }}
      >
        {apiChecks.length === 0 ? (
          <Typography.Text type="secondary">Click "Run Checks" to test all API endpoints</Typography.Text>
        ) : (
          <div style={{ display: 'grid', gap: 4 }}>
            {apiChecks.map((c) => (
              <div key={c.endpoint} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: c.status === 'ok' ? '#f6ffed' : '#fff2f0', borderRadius: 4, fontSize: 13 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.endpoint}</span>
                <Space size={8}>
                  <span style={{ color: '#8c8c8c', fontSize: 11 }}>{c.ms}ms</span>
                  {c.status === 'ok' ? <Tag color="success" style={{ margin: 0 }}>OK</Tag> : <Tag color="error" style={{ margin: 0 }}>{c.status}</Tag>}
                </Space>
              </div>
            ))}
            <div style={{ marginTop: 4, fontSize: 11, color: '#8c8c8c' }}>
              Avg response: {Math.round(apiChecks.reduce((a, c) => a + c.ms, 0) / apiChecks.length)}ms |
              Slowest: {apiChecks.reduce((a, c) => c.ms > a.ms ? c : a, apiChecks[0]).endpoint} ({Math.max(...apiChecks.map(c => c.ms))}ms)
            </div>
          </div>
        )}
      </Card>

      {/* ===== SERVER LOGS ===== */}
      <Card size="small" title={<><FileTextOutlined style={{ marginRight: 6 }} />Server Logs</>} style={{ marginBottom: 16 }}>
        {logs.length > 0 ? (
          <Collapse
            size="small"
            items={logs.map((log, i) => ({
              key: i,
              label: <span style={{ fontSize: 12 }}>{log.type} <Tag style={{ margin: 0 }}>{log.entries.length} lines</Tag></span>,
              children: (
                <div style={{ maxHeight: 200, overflow: 'auto', background: '#1e1e1e', borderRadius: 4, padding: 8 }}>
                  {log.entries.map((line: string, j: number) => (
                    <div key={j} style={{ fontFamily: 'monospace', fontSize: 10, color: line.includes('error') || line.includes('crit') ? '#ff7875' : '#d4d4d4', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {line}
                    </div>
                  ))}
                </div>
              ),
            }))}
          />
        ) : (
          <Typography.Text type="secondary">Loading logs...</Typography.Text>
        )}
      </Card>

      <Divider style={{ margin: '16px 0' }} />

      {/* ===== DATA MANAGEMENT ===== */}
      <Typography.Title level={5} style={{ margin: '0 0 12px' }}>
        <DeleteOutlined style={{ marginRight: 6 }} />
        Data Management
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
        Clear test data from individual tables. Machines and Users are protected.
      </Typography.Text>

      <div style={{ display: 'grid', gap: 8 }}>
        {tables.map((t) => {
          const canClear = clearableKeys.includes(t.key);
          return (
            <Card key={t.key} size="small" style={{ borderLeft: `3px solid ${canClear ? '#1890ff' : '#d9d9d9'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Typography.Text strong>{t.label}</Typography.Text>
                  <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 11, fontFamily: 'monospace' }}>{t.table}</Typography.Text>
                </div>
                <Space size={12}>
                  <Badge count={t.count} showZero style={{ backgroundColor: t.count > 0 ? '#1890ff' : '#d9d9d9' }} overflowCount={99999} />
                  {canClear ? (
                    <Popconfirm
                      title={`Clear all ${t.label}?`}
                      description={`This will permanently delete ${t.count} record(s).`}
                      onConfirm={() => handleClear(t.key)}
                      okText="Clear"
                      okButtonProps={{ danger: true }}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} loading={clearing === t.key} disabled={t.count === 0}>Clear</Button>
                    </Popconfirm>
                  ) : (
                    <Tag style={{ margin: 0 }}>Protected</Tag>
                  )}
                </Space>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
