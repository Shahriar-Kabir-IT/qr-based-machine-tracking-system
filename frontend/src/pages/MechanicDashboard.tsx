import { useEffect, useState } from 'react';
import { Card, Button, Tag, Typography, Modal, Form, Input, Empty, Badge, message, Row, Col, Statistic, Descriptions } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ToolOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import QrScanner from '../components/QrScanner';


function LiveTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const start = new Date(since).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [since]);
  return <span style={{ color: '#1890ff', fontWeight: 'bold' }}><ClockCircleOutlined /> {elapsed}</span>;
}

export default function MechanicDashboard() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishModal, setFinishModal] = useState<number | null>(null);
  const [scannedInfo, setScannedInfo] = useState<{ machine: any; issue: any } | null>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get('/downtime/active').then((res) => { setRecords(res.data); setLoading(false); });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (id: number) => {
    await api.put(`/downtime/${id}/acknowledge`);
    message.success('Acknowledged — timer started');
    load();
  };

  const handleFinish = async (values: any) => {
    if (finishModal === null) return;
    await api.put(`/downtime/${finishModal}/finish-repair`, values);
    message.success('Repair finished — waiting for line chief verification');
    setFinishModal(null);
    form.resetFields();
    load();
  };

  const handleQrScan = async (assetId: string) => {
    try {
      const machineRes = await api.get('/machines', { params: { search: assetId } });
      if (machineRes.data.length === 0) {
        message.error(`Machine not found: ${assetId}`);
        return;
      }
      const machine = machineRes.data[0];
      const machineFloor = machine.currentFloor || machine.floor;
      const machineFacility = machine.currentFacility || machine.facility;
      if (user?.facility && machineFacility !== user.facility) {
        message.error(`This machine belongs to ${machineFacility} factory — you are assigned to ${user.facility}`);
        return;
      }
      if (user?.floor && machineFloor !== user.floor) {
        message.error(`This machine is on ${machineFloor} floor — you are assigned to ${user.floor} floor`);
        return;
      }

      const issue = records.find((r) => r.machineId === machine.id);

      if (issue && issue.status === 'reported') {
        await api.put(`/downtime/${issue.id}/acknowledge`);
        message.success(`Acknowledged — ${machine.machineId} — timer started`);
        load();
        return;
      }

      if (issue && issue.status === 'acknowledged') {
        setScannedInfo({ machine, issue });
        return;
      }

      setScannedInfo({ machine, issue: issue || null });
    } catch {
      message.error('Failed to look up machine');
    }
  };

  const reported = records.filter((r) => r.status === 'reported');
  const inProgress = records.filter((r) => r.status === 'acknowledged');
  const awaitingVerification = records.filter((r) => r.status === 'repair_done');

  return (
    <div className="mc-page" style={{ padding: '16px 20px' }}>
      <div className="mc-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Title level={4} style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 20px)' }}>
            <ToolOutlined style={{ marginRight: 8 }} />
            Service Requests
            {reported.length > 0 && <Badge count={reported.length} style={{ marginLeft: 12 }} />}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Auto-refreshes every 15 seconds. Scan QR to acknowledge.
          </Typography.Text>
        </div>
        <QrScanner onScan={handleQrScan} buttonText="Scan QR" buttonSize="middle" />
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col xs={8} sm={8}>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #fa8c16' }}>
            <Statistic title={<span style={{ fontSize: 11 }}>New Reports</span>} value={reported.length} valueStyle={{ color: '#fa8c16', fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #1890ff' }}>
            <Statistic title={<span style={{ fontSize: 11 }}>In Progress</span>} value={inProgress.length} valueStyle={{ color: '#1890ff', fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #13c2c2' }}>
            <Statistic title={<span style={{ fontSize: 11 }}>Awaiting Verify</span>} value={awaitingVerification.length} valueStyle={{ color: '#13c2c2', fontSize: 20 }} />
          </Card>
        </Col>
      </Row>

      {records.length === 0 && !loading && <Empty description="No active service requests" />}

      {reported.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={5} style={{ margin: '0 0 8px' }}>
            <Badge count={reported.length} offset={[10, 0]}>New Reports</Badge>
          </Typography.Title>
          {reported.map((r) => (
            <Card key={r.id} size="small" style={{ marginBottom: 8, borderLeft: '4px solid #fa8c16' }}>
              <div className="mc-card-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text strong style={{ wordBreak: 'break-word' }}>{r.machine?.machineId || r.machineType} — Line {r.line || '?'}, {r.floor || '?'}</Typography.Text>
                  <p style={{ margin: '4px 0 0', color: '#555', wordBreak: 'break-word' }}>{r.issueDescription}</p>
                  <p style={{ margin: '4px 0 0' }}>
                    <WarningOutlined style={{ color: '#fa8c16', marginRight: 4 }} />
                    <span style={{ color: '#fa8c16', fontWeight: 'bold', fontSize: 12 }}>Waiting: </span>
                    <LiveTimer since={r.reportedAt} />
                  </p>
                  <p style={{ margin: 0, color: '#999', fontSize: 12 }}>
                    Reported by {r.reporterName} at {new Date(r.reportedAt).toLocaleString()}
                  </p>
                </div>
                <Button type="primary" onClick={() => handleAcknowledge(r.id)} style={{ flexShrink: 0 }}>Acknowledge</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {inProgress.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={5} style={{ margin: '0 0 8px' }}>In Progress</Typography.Title>
          {inProgress.map((r) => (
            <Card key={r.id} size="small" style={{ marginBottom: 8, borderLeft: '4px solid #1890ff' }}>
              <div className="mc-card-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text strong style={{ wordBreak: 'break-word' }}>{r.machine?.machineId || r.machineType} — Line {r.line || '?'}, {r.floor || '?'}</Typography.Text>
                  <p style={{ margin: '4px 0 0', color: '#555', wordBreak: 'break-word' }}>{r.issueDescription}</p>
                  <p style={{ margin: '4px 0 0' }}>
                    <LiveTimer since={r.acknowledgedAt} />
                  </p>
                </div>
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setFinishModal(r.id)} style={{ flexShrink: 0 }}>
                  Finish
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {awaitingVerification.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={5} style={{ margin: '0 0 8px' }}>Awaiting Line Chief Verification</Typography.Title>
          {awaitingVerification.map((r) => (
            <Card key={r.id} size="small" style={{ marginBottom: 8, borderLeft: '4px solid #13c2c2' }}>
              <div>
                <Typography.Text strong style={{ wordBreak: 'break-word' }}>{r.machine?.machineId || r.machineType} — Line {r.line || '?'}, {r.floor || '?'}</Typography.Text>
                <p style={{ margin: '4px 0 0', color: '#555', wordBreak: 'break-word' }}>
                  {r.repairNote} {r.sparePartsUsed ? `| Parts: ${r.sparePartsUsed}` : ''}
                </p>
                <p style={{ margin: 0, color: '#999', fontSize: 12 }}>
                  Repair time: {r.repairDurationMinutes} min
                </p>
                <Tag color="cyan" style={{ marginTop: 4 }}>Waiting for line chief</Tag>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* QR scan result modal */}
      <Modal
        title={null}
        open={!!scannedInfo}
        onCancel={() => setScannedInfo(null)}
        footer={null}
        width={480}
        className="mc-modal"
      >
        {scannedInfo && (
          <div>
            <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 12 }}>
              Scanned Machine
            </Typography.Title>
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Machine No"><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{scannedInfo.machine.machineId}</span></Descriptions.Item>
              <Descriptions.Item label="Type"><Tag color="blue">{scannedInfo.machine.machineType}</Tag></Descriptions.Item>
              <Descriptions.Item label="Brand">{scannedInfo.machine.brand || '—'}</Descriptions.Item>
              <Descriptions.Item label="Model">{scannedInfo.machine.modelNo || '—'}</Descriptions.Item>
              <Descriptions.Item label="Floor">{scannedInfo.machine.currentFloor || scannedInfo.machine.floor}</Descriptions.Item>
              <Descriptions.Item label="Line">{scannedInfo.machine.line || '—'}</Descriptions.Item>
            </Descriptions>

            {scannedInfo.issue?.status === 'acknowledged' && (
              <div style={{ textAlign: 'center' }}>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Issue: {scannedInfo.issue.issueDescription}
                </Typography.Text>
                <LiveTimer since={scannedInfo.issue.acknowledgedAt} />
                <div style={{ marginTop: 12 }}>
                  <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => { setScannedInfo(null); setFinishModal(scannedInfo.issue.id); }}>
                    Finish Servicing
                  </Button>
                </div>
              </div>
            )}

            {!scannedInfo.issue && scannedInfo.machine.status === 'active' && (
              <div style={{ padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, textAlign: 'center' }}>
                <Typography.Text>No active issues on this machine</Typography.Text>
              </div>
            )}

            {!scannedInfo.issue && scannedInfo.machine.status !== 'active' && (
              <div style={{ padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6, textAlign: 'center' }}>
                <Typography.Text>Machine status: {scannedInfo.machine.status?.replace(/_/g, ' ').toUpperCase()}</Typography.Text>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal title="Finish Servicing" open={finishModal !== null} onCancel={() => { setFinishModal(null); form.resetFields(); }} onOk={() => form.submit()} okText="Finish Servicing">
        <Form form={form} onFinish={handleFinish} layout="vertical">
          <Form.Item name="repairNote" label="What did you do?" rules={[{ required: true, message: 'Describe the repair' }]}>
            <Input.TextArea rows={3} placeholder="Describe what was repaired..." />
          </Form.Item>
          <Form.Item name="sparePartsUsed" label="Spare Parts Used (if any)">
            <Input placeholder="e.g. Belt, Needle, Bobbin Case" />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .mc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 16px;
        }
        .mc-card-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        @media (max-width: 576px) {
          .mc-header {
            flex-direction: column;
            gap: 12px;
          }
          .mc-card-row {
            flex-direction: column;
            gap: 8px;
          }
          .mc-card-row .ant-btn {
            width: 100%;
          }
          .mc-page {
            padding: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
