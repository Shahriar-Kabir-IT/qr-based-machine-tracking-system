import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Table, Tag, Empty, Spin, Select, Button, Steps } from 'antd';
import {
  ClockCircleOutlined,
  ToolOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  HomeOutlined,
  BuildOutlined,
} from '@ant-design/icons';
import api from '../api/client';

interface Mechanic {
  id: number;
  username: string;
  name: string;
  facility: string;
  floor: string;
}

interface KpiRecord {
  id: number;
  machineAssetId: string | null;
  machineType: string;
  line: string;
  floor: string;
  issueDescription: string;
  repairNote: string;
  sparePartsUsed: string;
  status: string;
  reportedAt: string;
  acknowledgedAt: string;
  finishedAt: string;
  verifiedAt: string;
  responseMinutes: number | null;
  repairDurationMinutes: number | null;
  totalDowntimeMinutes: number | null;
}

interface MechanicKpiData {
  mechanicUserId: number;
  mechanicName: string;
  totalRepairs: number;
  avgResponseMinutes: number;
  avgRepairMinutes: number;
  avgTotalDowntimeMinutes: number;
  fastestRepairMinutes: number;
  slowestRepairMinutes: number;
  monthlyBreakdown: Record<string, number>;
  records: KpiRecord[];
}

function formatDuration(minutes: number | null): string {
  if (minutes == null || minutes === 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function MechanicKPI() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loadingMechanics, setLoadingMechanics] = useState(true);

  const [selectedFactory, setSelectedFactory] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);

  const [kpiData, setKpiData] = useState<MechanicKpiData | null>(null);
  const [loadingKpi, setLoadingKpi] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    api.get('/users/mechanics').then((res) => {
      setMechanics(res.data);
      setLoadingMechanics(false);
    });
  }, []);

  const factories = [...new Set(mechanics.map((m) => m.facility).filter(Boolean))].sort();
  const floors = selectedFactory
    ? [...new Set(mechanics.filter((m) => m.facility === selectedFactory).map((m) => m.floor).filter(Boolean))].sort()
    : [];
  const filteredMechanics = mechanics.filter(
    (m) => m.facility === selectedFactory && m.floor === selectedFloor,
  );

  const loadKpi = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    setLoadingKpi(true);
    api.get('/downtime/mechanic-kpi', { params: { mechanicUserId: mechanic.id } }).then((res) => {
      setKpiData(res.data.length > 0 ? res.data[0] : null);
      setLoadingKpi(false);
    });
  };

  const goBack = () => {
    if (selectedMechanic) {
      setSelectedMechanic(null);
      setKpiData(null);
    } else if (selectedFloor) {
      setSelectedFloor(null);
    } else if (selectedFactory) {
      setSelectedFactory(null);
    }
  };

  const currentStep = selectedMechanic ? 3 : selectedFloor ? 2 : selectedFactory ? 1 : 0;

  if (loadingMechanics) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const recordColumns = [
    {
      title: 'Machine', dataIndex: 'machineAssetId', key: 'machine', width: 120,
      render: (v: string, r: KpiRecord) => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{v || r.machineType}</span>,
    },
    { title: 'Floor', dataIndex: 'floor', key: 'floor', width: 60 },
    { title: 'Line', dataIndex: 'line', key: 'line', width: 60, render: (v: string) => v || '—' },
    {
      title: 'Issue', dataIndex: 'issueDescription', key: 'issue', ellipsis: true,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Response', dataIndex: 'responseMinutes', key: 'response', width: 90, align: 'center' as const,
      render: (v: number | null) => {
        if (v == null) return '—';
        return <Tag color={v <= 5 ? 'green' : v <= 15 ? 'orange' : 'red'}>{formatDuration(v)}</Tag>;
      },
    },
    {
      title: 'Repair', dataIndex: 'repairDurationMinutes', key: 'repair', width: 90, align: 'center' as const,
      render: (v: number | null) => <Tag color="blue">{formatDuration(v)}</Tag>,
    },
    {
      title: 'Total', dataIndex: 'totalDowntimeMinutes', key: 'total', width: 90, align: 'center' as const,
      render: (v: number | null) => formatDuration(v),
    },
    {
      title: 'Parts', dataIndex: 'sparePartsUsed', key: 'parts', width: 120, ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      title: 'Date', dataIndex: 'reportedAt', key: 'date', width: 100,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div className="kpi-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {currentStep > 0 && (
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack} style={{ flexShrink: 0 }} />
          )}
          <div>
            <Typography.Title level={4} style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 20px)' }}>
              <DashboardOutlined style={{ marginRight: 8 }} />
              Mechanic KPI
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {!selectedFactory && 'Select a factory to begin'}
              {selectedFactory && !selectedFloor && `${selectedFactory} — Select a floor`}
              {selectedFloor && !selectedMechanic && `${selectedFactory} / ${selectedFloor} — Select a mechanic`}
              {selectedMechanic && `${selectedMechanic.name} — ${selectedFactory} / ${selectedFloor}`}
            </Typography.Text>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Steps
          current={currentStep}
          size="small"
          items={[
            { title: selectedFactory || 'Factory', icon: <HomeOutlined /> },
            { title: selectedFloor || 'Floor', icon: <BuildOutlined /> },
            { title: 'Mechanic', icon: <UserOutlined /> },
            { title: 'KPI', icon: <DashboardOutlined /> },
          ]}
        />
      </div>

      {/* Step 0: Select Factory */}
      {!selectedFactory && (
        <Row gutter={[12, 12]}>
          {factories.length === 0 && <Col span={24}><Empty description="No mechanics found with assigned factories" /></Col>}
          {factories.map((f) => {
            const count = mechanics.filter((m) => m.facility === f).length;
            return (
              <Col xs={12} sm={8} md={6} key={f}>
                <Card
                  hoverable
                  onClick={() => setSelectedFactory(f)}
                  style={{ textAlign: 'center', borderLeft: '4px solid #1677ff' }}
                  styles={{ body: { padding: '20px 12px' } }}
                >
                  <HomeOutlined style={{ fontSize: 28, color: '#1677ff', marginBottom: 8 }} />
                  <Typography.Title level={4} style={{ margin: '4px 0' }}>{f}</Typography.Title>
                  <Typography.Text type="secondary">{count} mechanic{count !== 1 ? 's' : ''}</Typography.Text>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Step 1: Select Floor */}
      {selectedFactory && !selectedFloor && (
        <Row gutter={[12, 12]}>
          {floors.length === 0 && <Col span={24}><Empty description="No floors found for this factory" /></Col>}
          {floors.map((f) => {
            const count = mechanics.filter((m) => m.facility === selectedFactory && m.floor === f).length;
            return (
              <Col xs={12} sm={8} md={6} key={f}>
                <Card
                  hoverable
                  onClick={() => setSelectedFloor(f)}
                  style={{ textAlign: 'center', borderLeft: '4px solid #52c41a' }}
                  styles={{ body: { padding: '20px 12px' } }}
                >
                  <BuildOutlined style={{ fontSize: 28, color: '#52c41a', marginBottom: 8 }} />
                  <Typography.Title level={4} style={{ margin: '4px 0' }}>{f} Floor</Typography.Title>
                  <Typography.Text type="secondary">{count} mechanic{count !== 1 ? 's' : ''}</Typography.Text>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Step 2: Select Mechanic */}
      {selectedFloor && !selectedMechanic && (
        <Row gutter={[12, 12]}>
          {filteredMechanics.length === 0 && <Col span={24}><Empty description="No mechanics on this floor" /></Col>}
          {filteredMechanics.map((m) => (
            <Col xs={12} sm={8} md={6} key={m.id}>
              <Card
                hoverable
                onClick={() => loadKpi(m)}
                style={{ textAlign: 'center', borderLeft: '4px solid #fa8c16' }}
                styles={{ body: { padding: '20px 12px' } }}
              >
                <UserOutlined style={{ fontSize: 28, color: '#fa8c16', marginBottom: 8 }} />
                <Typography.Title level={5} style={{ margin: '4px 0' }}>{m.name}</Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{m.username}</Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Step 3: KPI Detail */}
      {selectedMechanic && (
        loadingKpi ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>
        ) : !kpiData ? (
          <Empty description={`No completed repairs found for ${selectedMechanic.name}`} />
        ) : (
          <div>
            <Row gutter={[8, 8]} style={{ marginBottom: 20 }}>
              <Col xs={12} sm={4}>
                <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #1677ff' }}>
                  <Statistic title={<span style={{ fontSize: 11 }}>Total Repairs</span>} value={kpiData.totalRepairs} valueStyle={{ color: '#1677ff', fontSize: 20 }} prefix={<ToolOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={4}>
                <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #52c41a' }}>
                  <Statistic title={<span style={{ fontSize: 11 }}>Avg Response</span>} value={formatDuration(kpiData.avgResponseMinutes)} valueStyle={{ color: '#52c41a', fontSize: 20 }} prefix={<ClockCircleOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={4}>
                <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #fa8c16' }}>
                  <Statistic title={<span style={{ fontSize: 11 }}>Avg Repair</span>} value={formatDuration(kpiData.avgRepairMinutes)} valueStyle={{ color: '#fa8c16', fontSize: 20 }} prefix={<ThunderboltOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={4}>
                <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #ff4d4f' }}>
                  <Statistic title={<span style={{ fontSize: 11 }}>Avg Downtime</span>} value={formatDuration(kpiData.avgTotalDowntimeMinutes)} valueStyle={{ color: '#ff4d4f', fontSize: 20 }} prefix={<FallOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={4}>
                <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #13c2c2' }}>
                  <Statistic title={<span style={{ fontSize: 11 }}>Fastest Repair</span>} value={formatDuration(kpiData.fastestRepairMinutes)} valueStyle={{ color: '#13c2c2', fontSize: 16 }} prefix={<RiseOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={4}>
                <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #722ed1' }}>
                  <Statistic title={<span style={{ fontSize: 11 }}>Slowest Repair</span>} value={formatDuration(kpiData.slowestRepairMinutes)} valueStyle={{ color: '#722ed1', fontSize: 16 }} prefix={<FallOutlined />} />
                </Card>
              </Col>
            </Row>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Typography.Text strong style={{ fontSize: 14 }}>Monthly Breakdown</Typography.Text>
                {(() => {
                  const allYears = [...new Set(Object.keys(kpiData.monthlyBreakdown).map((k) => k.slice(0, 4)))].sort().reverse();
                  return allYears.length > 1 ? (
                    <Select value={selectedYear} onChange={setSelectedYear} size="small" style={{ width: 80 }}
                      options={allYears.map((y) => ({ label: y, value: y }))} />
                  ) : null;
                })()}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {monthNames.map((name, i) => {
                  const key = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
                  const count = kpiData.monthlyBreakdown[key] || 0;
                  return (
                    <div key={key} style={{
                      flex: '1 0 55px', textAlign: 'center', padding: '6px 4px',
                      background: count > 0 ? '#e6f7ff' : '#fafafa', borderRadius: 4,
                      border: `1px solid ${count > 0 ? '#91d5ff' : '#f0f0f0'}`,
                    }}>
                      <div style={{ fontSize: 10, color: '#999' }}>{name}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: count > 0 ? '#1677ff' : '#d9d9d9' }}>{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
              Repair History
            </Typography.Text>
            <div style={{ overflowX: 'auto' }}>
              <Table
                dataSource={kpiData.records}
                columns={recordColumns}
                rowKey="id"
                size="small"
                scroll={{ x: 800 }}
                pagination={{ pageSize: 10, size: 'small' }}
              />
            </div>
          </div>
        )
      )}

      <style>{`
        .kpi-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 16px;
        }
        @media (max-width: 576px) {
          .kpi-header {
            flex-direction: column;
            gap: 12px;
          }
          .ant-steps {
            font-size: 12px;
          }
          .ant-steps-item-title {
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
