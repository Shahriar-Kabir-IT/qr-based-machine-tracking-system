import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Tag, message, Card, Row, Col, Statistic, Badge, Tooltip, Space, Descriptions } from 'antd';
import { WarningOutlined, CheckCircleOutlined, EyeOutlined, ToolOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import QrScanner from '../components/QrScanner';

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: 'success', label: 'Active' },
  under_repair: { color: 'warning', label: 'Under Repair' },
  in_transit: { color: 'processing', label: 'In Transit' },
  on_loan: { color: 'warning', label: 'On Loan' },
  pending_super_admin: { color: 'warning', label: 'Pending' },
  pending_admin: { color: 'processing', label: 'Pending' },
  rejected: { color: 'error', label: 'Rejected' },
  transferred: { color: 'default', label: 'Transferred' },
};

export default function LineChiefDashboard() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIssues, setActiveIssues] = useState<any[]>([]);
  const [reportModal, setReportModal] = useState<any>(null);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [verifyModal, setVerifyModal] = useState<number | null>(null);
  const [scannedMachine, setScannedMachine] = useState<any>(null);
  const [form] = Form.useForm();
  const [verifyForm] = Form.useForm();
  const [scanReportForm] = Form.useForm();

  const load = () => {
    setLoading(true);
    const params: any = {};
    if (user?.facility) params.facility = user.facility;
    if (user?.floor) params.floor = user.floor;
    api.get('/machines', { params }).then((res) => {
      setMachines(res.data);
      setLoading(false);
    });
    api.get('/downtime/active').then((res) => {
      setActiveIssues(res.data);
    });
  };

  useEffect(() => { load(); }, []);

  const handleReport = async (values: any) => {
    await api.post('/downtime', {
      machineId: reportModal.id,
      machineType: reportModal.machineType,
      line: reportModal.line,
      floor: reportModal.currentFloor || reportModal.floor,
      issueDescription: values.issueDescription,
    });
    message.success('Issue reported — mechanic will be notified');
    setReportModal(null);
    form.resetFields();
    load();
  };

  const handleScanReport = async (values: any) => {
    await api.post('/downtime', {
      machineId: scannedMachine.id,
      machineType: scannedMachine.machineType,
      line: scannedMachine.line,
      floor: scannedMachine.currentFloor || scannedMachine.floor,
      issueDescription: values.issueDescription,
    });
    message.success('Issue reported — mechanic will be notified');
    setScannedMachine(null);
    scanReportForm.resetFields();
    load();
  };

  const handleVerify = async (values: { verificationNote: string }) => {
    if (verifyModal === null) return;
    await api.put(`/downtime/${verifyModal}/verify`, values);
    message.success('Service verified — machine is back to active');
    setVerifyModal(null);
    verifyForm.resetFields();
    load();
  };

  const handleQrScan = async (assetId: string) => {
    try {
      const res = await api.get('/machines', { params: { search: assetId } });
      if (res.data.length === 0) {
        message.error(`Machine not found: ${assetId}`);
        return;
      }
      const machine = res.data[0];
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
      setScannedMachine(machine);
    } catch {
      message.error('Failed to look up machine');
    }
  };

  const activeCount = machines.filter((m) => m.status === 'active').length;
  const repairCount = machines.filter((m) => m.status === 'under_repair').length;
  const myActiveIssues = activeIssues.filter((r) => {
    const m = machines.find((machine) => machine.id === r.machineId);
    return !!m;
  });
  const pendingVerification = myActiveIssues.filter((r) => r.status === 'repair_done');

  const scannedIssue = scannedMachine ? myActiveIssues.find((r) => r.machineId === scannedMachine.id) : null;

  const columns = [
    {
      title: 'Machine No', dataIndex: 'machineId', key: 'machineId',
      render: (v: string) => v ? <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span> : '—',
      sorter: (a: any, b: any) => (a.machineId || '').localeCompare(b.machineId || ''),
      defaultSortOrder: 'ascend' as const,
    },
    { title: 'Type', dataIndex: 'machineType', key: 'type', width: 70, render: (v: string) => <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{v}</Tag> },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', responsive: ['md' as const], render: (v: string) => v || '—' },
    { title: 'Model', dataIndex: 'modelNo', key: 'model', responsive: ['md' as const], render: (v: string) => v || '—' },
    { title: 'Line', dataIndex: 'line', key: 'line', width: 60, render: (v: string) => v || '—' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => {
        const cfg = statusConfig[s] || { color: 'default', label: s };
        return <Badge status={cfg.color as any} text={<span style={{ fontSize: 12 }}>{cfg.label}</span>} />;
      },
    },
    {
      title: '', key: 'action', width: 100, fixed: 'right' as const,
      render: (_: any, record: any) => {
        const issue = myActiveIssues.find((r) => r.machineId === record.id);
        return (
          <Space size={4} wrap>
            <Tooltip title="Details">
              <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setDetailModal(record)} />
            </Tooltip>
            {record.status === 'active' && (
              <Button size="small" type="primary" danger icon={<WarningOutlined />} onClick={() => setReportModal(record)}>
                Report
              </Button>
            )}
            {issue?.status === 'repair_done' && (
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => setVerifyModal(issue.id)}>
                Verify
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="lc-page" style={{ padding: '16px 20px' }}>
      <div className="lc-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Title level={4} style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 20px)' }}>
            My Machines — {user?.facility} / {user?.floor} Floor
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Machines on your floor. Report issues to send for servicing.
          </Typography.Text>
        </div>
        <QrScanner onScan={handleQrScan} buttonText="Scan QR to Report" buttonSize="middle" />
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #1677ff' }}>
            <Statistic title={<span style={{ fontSize: 11 }}>Total</span>} value={machines.length} valueStyle={{ color: '#1677ff', fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #52c41a' }}>
            <Statistic title={<span style={{ fontSize: 11 }}>Active</span>} value={activeCount} valueStyle={{ color: '#52c41a', fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #fa8c16' }}>
            <Statistic title={<span style={{ fontSize: 11 }}>Under Repair</span>} value={repairCount} valueStyle={{ color: '#fa8c16', fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #13c2c2' }}>
            <Statistic title={<span style={{ fontSize: 11 }}>Pending Verify</span>} value={pendingVerification.length} valueStyle={{ color: '#13c2c2', fontSize: 20 }} />
          </Card>
        </Col>
      </Row>

      {pendingVerification.length > 0 && (
        <div style={{ marginBottom: 16, padding: '8px 12px', background: '#e6fffb', border: '1px solid #87e8de', borderRadius: 6 }}>
          <Typography.Text strong style={{ color: '#006d75' }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            {pendingVerification.length} machine{pendingVerification.length > 1 ? 's' : ''} repaired — awaiting your verification
          </Typography.Text>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <Table
          dataSource={machines}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 700 }}
          pagination={{ pageSize: 20, showSizeChanger: true, size: 'small' }}
          rowClassName={(record) => {
            const issue = myActiveIssues.find((r) => r.machineId === record.id);
            if (issue?.status === 'repair_done') return 'row-verify';
            if (record.status === 'under_repair') return 'row-repair';
            return '';
          }}
        />
      </div>

      <style>{`
        .row-repair { background: #fff7e6 !important; }
        .row-repair:hover > td { background: #fff1cc !important; }
        .row-verify { background: #e6fffb !important; }
        .row-verify:hover > td { background: #b5f5ec !important; }
        .lc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 16px;
        }
        @media (max-width: 576px) {
          .lc-header {
            flex-direction: column;
            gap: 12px;
          }
          .lc-page {
            padding: 12px !important;
          }
        }
      `}</style>

      {/* Manual report from table */}
      <Modal title="Report Machine Issue" open={!!reportModal} onCancel={() => { setReportModal(null); form.resetFields(); }} onOk={() => form.submit()} okText="Report Issue" okButtonProps={{ danger: true }}>
        <p style={{ marginBottom: 16, color: '#888' }}>
          Reporting issue for: <strong>{reportModal?.machineId}</strong> ({reportModal?.machineType})
        </p>
        <Form form={form} onFinish={handleReport} layout="vertical">
          <Form.Item name="issueDescription" label="Describe the Problem" rules={[{ required: true, message: 'Please describe the issue' }]}>
            <Input.TextArea rows={4} placeholder="Describe what's wrong with the machine..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* QR scan result — machine details + report */}
      <Modal
        title={null}
        open={!!scannedMachine}
        onCancel={() => { setScannedMachine(null); scanReportForm.resetFields(); }}
        footer={null}
        width={520}
      >
        {scannedMachine && (
          <div>
            <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 12 }}>
              Scanned Machine
            </Typography.Title>
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Machine No"><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{scannedMachine.machineId}</span></Descriptions.Item>
              <Descriptions.Item label="Type"><Tag color="blue">{scannedMachine.machineType}</Tag></Descriptions.Item>
              <Descriptions.Item label="Brand">{scannedMachine.brand || '—'}</Descriptions.Item>
              <Descriptions.Item label="Model">{scannedMachine.modelNo || '—'}</Descriptions.Item>
              <Descriptions.Item label="Serial No">{scannedMachine.mfgSerialNo || '—'}</Descriptions.Item>
              <Descriptions.Item label="Line">{scannedMachine.line || '—'}</Descriptions.Item>
              <Descriptions.Item label="Factory">{scannedMachine.currentFacility || scannedMachine.facility}</Descriptions.Item>
              <Descriptions.Item label="Floor">{scannedMachine.currentFloor || scannedMachine.floor}</Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                <Badge status={(statusConfig[scannedMachine.status]?.color || 'default') as any} text={statusConfig[scannedMachine.status]?.label || scannedMachine.status} />
              </Descriptions.Item>
            </Descriptions>

            {scannedMachine.status === 'under_repair' && scannedIssue?.status === 'repair_done' && (
              <div style={{ textAlign: 'center' }}>
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => { setScannedMachine(null); setVerifyModal(scannedIssue.id); }}>
                  Verify Service Done
                </Button>
              </div>
            )}

            {scannedMachine.status === 'under_repair' && (!scannedIssue || scannedIssue.status !== 'repair_done') && (
              <div style={{ padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6, textAlign: 'center' }}>
                <Typography.Text type="warning">This machine is already under repair</Typography.Text>
              </div>
            )}

            {scannedMachine.status === 'active' && (
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                  <WarningOutlined style={{ color: '#ff4d4f', marginRight: 4 }} /> Report an Issue
                </Typography.Text>
                <Form form={scanReportForm} onFinish={handleScanReport} layout="vertical">
                  <Form.Item name="issueDescription" label="Describe the Problem" rules={[{ required: true, message: 'Please describe the issue' }]}>
                    <Input.TextArea rows={3} placeholder="Describe what's wrong with the machine..." />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                    <Button type="primary" danger htmlType="submit" icon={<WarningOutlined />}>Report Issue</Button>
                  </Form.Item>
                </Form>
              </div>
            )}

            {!['active', 'under_repair'].includes(scannedMachine.status) && (
              <div style={{ padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, textAlign: 'center' }}>
                <Typography.Text>Machine status: {statusConfig[scannedMachine.status]?.label || scannedMachine.status}</Typography.Text>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal title="Verify Service Done" open={verifyModal !== null} onCancel={() => { setVerifyModal(null); verifyForm.resetFields(); }} onOk={() => verifyForm.submit()} okText="Confirm Service Done">
        {(() => {
          const issue = verifyModal !== null ? myActiveIssues.find((r) => r.id === verifyModal) : null;
          return issue ? (
            <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8, color: '#389e0d' }}>
                <ToolOutlined style={{ marginRight: 4 }} /> Mechanic's Repair Report
              </Typography.Text>
              <div style={{ marginBottom: 6 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Machine:</Typography.Text>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{issue.machine?.machineId || issue.machineType} — Line {issue.line || '?'}</div>
              </div>
              <div style={{ marginBottom: 6 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Repair Notes:</Typography.Text>
                <div style={{ fontSize: 13 }}>{issue.repairNote || 'No notes provided'}</div>
              </div>
              <div style={{ marginBottom: 6 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Spare Parts Used:</Typography.Text>
                <div style={{ fontSize: 13 }}>{issue.sparePartsUsed || 'None'}</div>
              </div>
              {issue.repairDurationMinutes != null && (
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Repair Duration:</Typography.Text>
                  <div style={{ fontSize: 13 }}>{issue.repairDurationMinutes} minutes</div>
                </div>
              )}
            </div>
          ) : null;
        })()}
        <Form form={verifyForm} onFinish={handleVerify} layout="vertical">
          <Form.Item name="verificationNote" label="Verification Comment" rules={[{ required: true, message: 'Please add a comment' }]}>
            <Input.TextArea rows={3} placeholder="e.g. Checked machine, running smoothly now..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={null} open={!!detailModal} onCancel={() => setDetailModal(null)} footer={null} width={480}>
        {detailModal && (
          <div>
            <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 12 }}>Machine Details</Typography.Title>
            <Row gutter={[12, 8]} style={{ fontSize: 13 }}>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Machine No</Typography.Text><br /><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{detailModal.machineId}</span></Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Machine No</Typography.Text><br /><span style={{ fontFamily: 'monospace' }}>{detailModal.machineId}</span></Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Type</Typography.Text><br /><Tag color="blue" style={{ margin: 0 }}>{detailModal.machineType}</Tag></Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Brand</Typography.Text><br />{detailModal.brand || '—'}</Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Model</Typography.Text><br />{detailModal.modelNo || '—'}</Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Serial No</Typography.Text><br />{detailModal.mfgSerialNo || '—'}</Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Year</Typography.Text><br />{detailModal.year || '—'}</Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Line</Typography.Text><br />{detailModal.line || '—'}</Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Factory</Typography.Text><br /><strong>{detailModal.currentFacility || detailModal.facility}</strong></Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Floor</Typography.Text><br />{detailModal.currentFloor || detailModal.floor}</Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Status</Typography.Text><br /><Badge status={(statusConfig[detailModal.status]?.color || 'default') as any} text={statusConfig[detailModal.status]?.label || detailModal.status} /></Col>
              {detailModal.remarks && <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Remarks</Typography.Text><br />{detailModal.remarks}</Col>}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}
