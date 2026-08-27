import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, Tag, Card, Typography, message, Steps, Statistic, Row, Col, Space, Badge, Tooltip, DatePicker, Alert } from 'antd';
import { PlusOutlined, ClockCircleOutlined, CloseCircleOutlined, InboxOutlined, EyeOutlined, SwapOutlined, RollbackOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getMachineTypeDisplay } from '../utils/machineTypes';
import dayjs from 'dayjs';

const approvalSteps = ['pending_super_admin', 'pending_admin', 'active'];
const approvalStepLabels: Record<string, string> = { pending_super_admin: 'Super Admin Review', pending_admin: 'Administration Review', active: 'Approved & Active' };

const statusConfig: Record<string, { color: string; label: string }> = {
  pending_super_admin: { color: 'warning', label: 'Pending (WS)' },
  pending_admin: { color: 'processing', label: 'Pending (Admin)' },
  active: { color: 'success', label: 'Active' },
  rejected: { color: 'error', label: 'Rejected' },
  under_repair: { color: 'warning', label: 'Under Repair' },
  in_transit: { color: 'processing', label: 'In Transit' },
  transferred: { color: 'default', label: 'Transferred' },
  on_loan: { color: 'warning', label: 'On Loan' },
};

const transferStatusColor: Record<string, string> = { requested: 'blue', first_approved: 'cyan', second_approved: 'geekblue', dispatched: 'orange', received: 'green', rejected: 'red', return_requested: 'volcano', return_approved: 'green' };
const transferStatusLabel: Record<string, string> = { requested: 'Requested', first_approved: '1st Approved', second_approved: '2nd Approved', dispatched: 'Dispatched', received: 'Received', rejected: 'Rejected', return_requested: 'Return Pending', return_approved: 'Returned' };

const sectionOptions = [
  { value: 'SE', label: 'SE - Sewing' },
  { value: 'CU', label: 'CU - Cutting' },
  { value: 'UT', label: 'UT - Utility' },
  { value: 'FN', label: 'FN - Finishing' },
];
const sectionLabels: Record<string, string> = { SE: 'Sewing', CU: 'Cutting', UT: 'Utility', FN: 'Finishing' };

import { machineTypeOptions } from '../utils/machineTypes';

export default function UserDashboard() {
  const { user } = useAuth();
  const facility = user?.facility || '';

  const [machines, setMachines] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loanedTransfers, setLoanedTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState({ machines: true, requests: true, transfers: true, loaned: true });
  const [addModal, setAddModal] = useState(false);
  const [transferModal, setTransferModal] = useState<any>(null);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [basisValue, setBasisValue] = useState<string | null>(null);
  const [machineDetailModal, setMachineDetailModal] = useState<any>(null);
  const [nextMachineId, setNextMachineId] = useState('');
  const [suggestions, setSuggestions] = useState<{ floors: string[]; sections: string[]; lines: string[] }>({ floors: [], sections: [], lines: [] });
  const [form] = Form.useForm();
  const [transferForm] = Form.useForm();

  const loadMachines = () => {
    setLoading((p) => ({ ...p, machines: true }));
    api.get('/machines', { params: { facility, status: 'active' } }).then((res) => {
      setMachines(res.data);
      setLoading((p) => ({ ...p, machines: false }));
    });
  };
  const loadRequests = () => {
    setLoading((p) => ({ ...p, requests: true }));
    api.get('/machines/my-requests').then((res) => {
      setMyRequests(res.data);
      setLoading((p) => ({ ...p, requests: false }));
    });
  };
  const loadTransfers = () => {
    setLoading((p) => ({ ...p, transfers: true }));
    api.get('/transfers', { params: { facility } }).then((res) => {
      setTransfers(res.data);
      setLoading((p) => ({ ...p, transfers: false }));
    });
  };
  const loadLoaned = () => {
    setLoading((p) => ({ ...p, loaned: true }));
    api.get('/transfers/loaned', { params: { facility } }).then((res) => {
      setLoanedTransfers(res.data);
      setLoading((p) => ({ ...p, loaned: false }));
    });
  };

  const loadSuggestions = () => {
    api.get('/rental/suggestions').then((res) => {
      setSuggestions({ floors: res.data.floors || [], sections: res.data.sections || [], lines: res.data.lines || [] });
    });
  };

  useEffect(() => { loadMachines(); loadRequests(); loadTransfers(); loadLoaned(); loadSuggestions(); }, []);

  const fetchNextId = async (fac?: string, machineType?: string) => {
    if (!fac || !machineType) { setNextMachineId(''); return; }
    const res = await api.get('/machines/next-id', { params: { facility: fac, type: machineType } });
    setNextMachineId(res.data.machineId || '');
  };

  const handleAddMachine = async (values: any) => {
    await api.post('/machines', { ...values, facility });
    message.success('Machine submitted for approval');
    setAddModal(false);
    form.resetFields();
    setNextMachineId('');
    loadRequests();
  };

  const handleReceive = async (transferId: number) => {
    await api.put(`/transfers/${transferId}/receive`);
    message.success('Machine received');
    loadTransfers();
    loadMachines();
    loadLoaned();
  };

  const handleTransferRequest = async (values: any) => {
    const m = transferModal;
    const fromFac = m.currentFacility || m.facility;
    await api.post('/transfers', {
      machineId: m.id,
      fromFacility: fromFac,
      fromFloor: m.currentFloor || m.floor,
      fromSection: m.section,
      fromLine: m.line,
      toFacility: values.basis === 'internal' ? fromFac : values.toFacility,
      toFloor: values.toFloor,
      toSection: values.toSection,
      toLine: values.toLine,
      basis: values.basis,
      reason: values.reason,
      expectedReturnDate: values.expectedReturnDate ? values.expectedReturnDate.format('YYYY-MM-DD') : null,
    });
    message.success('Transfer request submitted');
    setTransferModal(null);
    transferForm.resetFields();
    setBasisValue(null);
    loadTransfers();
  };

  const handleReturnRequest = async (transferId: number, toFacility: string) => {
    await api.put(`/transfers/${transferId}/request-return`);
    message.success(`Return to ${toFacility} requested`);
    loadLoaned();
    loadTransfers();
    loadMachines();
  };

  const pendingCount = myRequests.filter((m) => ['pending_super_admin', 'pending_admin'].includes(m.status)).length;
  const rejectedCount = myRequests.filter((m) => m.status === 'rejected').length;
  const incomingTransfers = transfers.filter((t) => t.toFacility === facility && t.status === 'dispatched');

  const sentOnLoan = loanedTransfers.filter((t) => t.fromFacility === facility);
  const receivedOnLoan = loanedTransfers.filter((t) => t.toFacility === facility);

  const uniqueSections = [...new Set(machines.map((m) => m.section || 'SE'))].sort();
  const uniqueTypes = [...new Set(machines.map((m) => m.machineType))].sort();
  const uniqueFloors = [...new Set(machines.map((m) => m.currentFloor || m.floor))].sort();

  const machineColumns: ColumnsType<any> = [
    {
      title: 'Machine No', dataIndex: 'machineId', key: 'machineId',
      sorter: (a: any, b: any) => (a.machineId || '').localeCompare(b.machineId || ''),
      defaultSortOrder: 'ascend', ellipsis: true,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Sec', dataIndex: 'section', key: 'section', width: 55,
      filters: uniqueSections.map((s) => ({ text: `${s} - ${sectionLabels[s] || s}`, value: s })),
      onFilter: (value: any, record: any) => (record.section || 'SE') === value,
      sorter: (a: any, b: any) => (a.section || 'SE').localeCompare(b.section || 'SE'),
      render: (v: string) => <Tag style={{ margin: 0, fontSize: 11 }}>{v || 'SE'}</Tag>,
    },
    {
      title: 'Type', dataIndex: 'machineType', key: 'type', width: 65,
      filters: uniqueTypes.map((t) => ({ text: t, value: t })),
      onFilter: (value: any, record: any) => record.machineType === value,
      sorter: (a: any, b: any) => a.machineType.localeCompare(b.machineType),
      render: (v: string) => <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: 'Brand / Model', key: 'brandModel', ellipsis: true,
      render: (_: any, r: any) => (
        <span>
          <span style={{ fontWeight: 500, fontSize: 12 }}>{r.brand || '—'}</span>
          {r.modelNo && <span style={{ color: '#8c8c8c', fontSize: 11 }}> {r.modelNo}</span>}
        </span>
      ),
    },
    {
      title: 'Floor', dataIndex: 'currentFloor', key: 'floor', width: 60,
      filters: uniqueFloors.map((f) => ({ text: f, value: f })),
      onFilter: (value: any, record: any) => (record.currentFloor || record.floor) === value,
      sorter: (a: any, b: any) => (a.currentFloor || a.floor || '').localeCompare(b.currentFloor || b.floor || ''),
      render: (v: string) => <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: 'Line', dataIndex: 'line', key: 'line', width: 70, ellipsis: true,
      render: (v: string) => v || <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => {
        const cfg = statusConfig[s] || { color: 'default', label: s };
        return <Badge status={cfg.color as any} text={<span style={{ fontSize: 12 }}>{cfg.label}</span>} />;
      },
    },
    {
      title: '', key: 'action', width: 70, align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size={2}>
          <Tooltip title="View Details">
            <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setMachineDetailModal(record)} style={{ padding: '0 4px' }} />
          </Tooltip>
          <Tooltip title="Transfer">
            <Button size="small" type="text" icon={<SwapOutlined />} onClick={() => { setTransferModal(record); transferForm.resetFields(); setBasisValue(null); }} style={{ padding: '0 4px' }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const requestColumns: ColumnsType<any> = [
    { title: 'Machine No', dataIndex: 'machineId', key: 'machineId', ellipsis: true, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: 'Type', dataIndex: 'machineType', key: 'type', width: 65, render: (v: string) => <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{v}</Tag> },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 60, ellipsis: true, render: (v: string) => v || '—' },
    { title: 'Floor', dataIndex: 'floor', key: 'floor', width: 55, render: (v: string) => <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>{v}</Tag> },
    {
      title: 'Submitted', dataIndex: 'createdAt', key: 'createdAt', width: 100,
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (v: string) => <span style={{ fontSize: 11, color: '#8c8c8c' }}>{dayjs(v).format('DD MMM YY')}</span>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: (s: string) => {
        if (s === 'rejected') return <Badge status="error" text={<span style={{ fontSize: 12 }}>Rejected</span>} />;
        if (s === 'active') return <Badge status="success" text={<span style={{ fontSize: 12 }}>Approved</span>} />;
        if (s === 'pending_super_admin') return <Badge status="warning" text={<span style={{ fontSize: 12 }}>At Super Admin</span>} />;
        if (s === 'pending_admin') return <Badge status="processing" text={<span style={{ fontSize: 12 }}>At Admin</span>} />;
        return <Badge status="default" text={s} />;
      },
    },
    { title: '', key: 'action', width: 32, render: (_: any, r: any) => <Tooltip title="Details"><Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setDetailModal(r)} style={{ padding: '0 4px' }} /></Tooltip> },
  ];

  const transferColumns: ColumnsType<any> = [
    { title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', width: 140, ellipsis: true, render: (v: string) => v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'From', key: 'from', width: 90, render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.fromFacility}/{r.fromFloor}</span> },
    { title: 'To', key: 'to', width: 90, render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.toFacility}/{r.toFloor}</span> },
    { title: 'Type', dataIndex: 'basis', key: 'basis', width: 90, render: (v: string) => <Tag color={v === 'permanent' ? 'purple' : v === 'internal' ? 'gold' : 'cyan'} style={{ margin: 0, fontSize: 11 }}>{v?.toUpperCase()}</Tag> },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => <Tag color={transferStatusColor[s]} style={{ margin: 0, fontSize: 11 }}>{transferStatusLabel[s]}</Tag> },
    { title: 'Date', dataIndex: 'requestedAt', key: 'time', width: 90, render: (v: string) => <span style={{ fontSize: 11, color: '#8c8c8c' }}>{dayjs(v).format('DD MMM YY')}</span> },
    {
      title: '', key: 'action', width: 90, fixed: 'right' as const,
      render: (_: any, r: any) => r.status === 'dispatched' && r.toFacility === facility
        ? <Button type="primary" size="small" icon={<InboxOutlined />} onClick={() => handleReceive(r.id)} style={{ fontSize: 11 }}>Receive</Button>
        : null,
    },
  ];

  const loanColumns: ColumnsType<any> = [
    { title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', ellipsis: true, render: (v: string) => v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : '—' },
    { title: 'Machine', dataIndex: ['machine', 'machineId'], key: 'machineId', ellipsis: true, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: 'From', key: 'from', width: 70, render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.fromFacility}</span> },
    { title: 'To', key: 'to', width: 70, render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.toFacility}</span> },
    {
      title: 'Return By', dataIndex: 'expectedReturnDate', key: 'returnDate', width: 100,
      render: (v: string) => {
        if (!v) return <span style={{ color: '#d9d9d9', fontSize: 11 }}>Not set</span>;
        const isOverdue = dayjs(v).isBefore(dayjs(), 'day');
        return <span style={{ fontSize: 11, color: isOverdue ? '#ff4d4f' : '#8c8c8c', fontWeight: isOverdue ? 600 : 400 }}>{dayjs(v).format('DD MMM YY')}{isOverdue && ' !'}</span>;
      },
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (s: string) => <Tag color={transferStatusColor[s]} style={{ margin: 0, fontSize: 11 }}>{transferStatusLabel[s]}</Tag>,
    },
    {
      title: '', key: 'action', width: 120,
      render: (_: any, r: any) => {
        if (r.status === 'received' && r.toFacility === facility) {
          return <Button size="small" icon={<RollbackOutlined />} onClick={() => handleReturnRequest(r.id, r.fromFacility)} style={{ fontSize: 11 }}>Return to {r.fromFacility}</Button>;
        }
        if (r.status === 'return_requested') {
          return <Tag color="volcano" style={{ margin: 0, fontSize: 11 }}>Awaiting Approval</Tag>;
        }
        return null;
      },
    },
  ];

  const overdueLoans = loanedTransfers.filter((t) => t.expectedReturnDate && dayjs(t.expectedReturnDate).isBefore(dayjs(), 'day') && t.status === 'received');

  return (
    <div style={{ padding: '16px 20px' }}>
      <style>{`
        .ud-table .ant-table { font-size: 13px; }
        .ud-table .ant-table-thead > tr > th { font-size: 12px; font-weight: 600; white-space: nowrap; padding: 8px 6px !important; background: #fafafa; }
        .ud-table .ant-table-tbody > tr > td { padding: 5px 6px !important; }
        .ud-table .ant-table-column-sorters { justify-content: flex-start; gap: 2px; }
        .ud-table .ant-table-filter-trigger { margin-inline-end: -4px; }
        @media (max-width: 768px) {
          .ud-stats .ant-col { flex: 0 0 50% !important; max-width: 50% !important; margin-bottom: 8px; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>{facility} Factory Dashboard</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Manage machines and track approvals</Typography.Text>
        </div>
      </div>

      <Row gutter={[8, 8]} className="ud-stats" style={{ marginBottom: 12 }}>
        <Col span={6}><Card size="small" styles={{ body: { padding: '6px 10px' } }} style={{ borderLeft: '3px solid #52c41a' }}><Statistic title={<span style={{ fontSize: 11 }}>Active</span>} value={machines.length} valueStyle={{ color: '#52c41a', fontSize: 20 }} /></Card></Col>
        <Col span={6}><Card size="small" styles={{ body: { padding: '6px 10px' } }} style={{ borderLeft: '3px solid #faad14' }}><Statistic title={<span style={{ fontSize: 11 }}>Pending</span>} value={pendingCount} valueStyle={{ color: '#faad14', fontSize: 20 }} prefix={<ClockCircleOutlined style={{ fontSize: 14 }} />} /></Card></Col>
        <Col span={6}><Card size="small" styles={{ body: { padding: '6px 10px' } }} style={{ borderLeft: '3px solid #ff7a45' }}><Statistic title={<span style={{ fontSize: 11 }}>On Loan</span>} value={loanedTransfers.length} valueStyle={{ color: '#ff7a45', fontSize: 20 }} prefix={<SwapOutlined style={{ fontSize: 14 }} />} /></Card></Col>
        <Col span={6}><Card size="small" styles={{ body: { padding: '6px 10px' } }} style={{ borderLeft: '3px solid #ff4d4f' }}><Statistic title={<span style={{ fontSize: 11 }}>Rejected</span>} value={rejectedCount} valueStyle={{ color: '#ff4d4f', fontSize: 20 }} prefix={<CloseCircleOutlined style={{ fontSize: 14 }} />} /></Card></Col>
      </Row>

      {overdueLoans.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={<span style={{ fontSize: 12 }}>{overdueLoans.length} loaned machine(s) overdue for return</span>}
          style={{ marginBottom: 12 }}
        />
      )}

      {incomingTransfers.length > 0 && (
        <Card title={<span style={{ fontSize: 13 }}><InboxOutlined style={{ color: '#faad14', marginRight: 6 }} />Incoming Transfers ({incomingTransfers.length})</span>} size="small" style={{ marginBottom: 12, border: '1px solid #faad14', borderRadius: 6 }} styles={{ body: { padding: 0 } }}>
          <div className="ud-table"><Table dataSource={incomingTransfers} columns={transferColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 600 }} /></div>
        </Card>
      )}

      <Card size="small" style={{ borderRadius: 6 }} styles={{ body: { padding: 0 } }}>
        <Tabs
          defaultActiveKey="machines"
          style={{ padding: '0 12px' }}
          size="small"
          tabBarExtraContent={
            <Space size={4}>
              <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => { form.setFieldsValue({ facility, section: 'SE' }); setAddModal(true); }}>Add Machine</Button>
            </Space>
          }
          items={[
            {
              key: 'machines',
              label: <span style={{ fontSize: 13 }}>Machines <Badge count={machines.length} style={{ backgroundColor: '#52c41a', marginLeft: 4 }} size="small" /></span>,
              children: <div className="ud-table"><Table dataSource={machines} columns={machineColumns} rowKey="id" loading={loading.machines} size="small" scroll={{ x: 700 }} pagination={{ pageSize: 20, showSizeChanger: true, size: 'small', showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }} tableLayout="auto" /></div>,
            },
            {
              key: 'loaned',
              label: <span style={{ fontSize: 13 }}>Loaned <Badge count={loanedTransfers.length} style={{ backgroundColor: '#ff7a45', marginLeft: 4 }} size="small" /></span>,
              children: (
                <div>
                  {sentOnLoan.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <Typography.Text strong style={{ fontSize: 12, color: '#8c8c8c' }}>Sent on Loan ({sentOnLoan.length})</Typography.Text>
                      <div className="ud-table"><Table dataSource={sentOnLoan} columns={loanColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 600 }} /></div>
                    </div>
                  )}
                  {receivedOnLoan.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <Typography.Text strong style={{ fontSize: 12, color: '#8c8c8c' }}>Received on Loan ({receivedOnLoan.length})</Typography.Text>
                      <div className="ud-table"><Table dataSource={receivedOnLoan} columns={loanColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 600 }} /></div>
                    </div>
                  )}
                  {loanedTransfers.length === 0 && <Typography.Text type="secondary" style={{ display: 'block', padding: 20, textAlign: 'center' }}>No active loans</Typography.Text>}
                </div>
              ),
            },
            {
              key: 'requests',
              label: <span style={{ fontSize: 13 }}>My Requests <Badge count={myRequests.length} style={{ backgroundColor: '#1677ff', marginLeft: 4 }} size="small" /></span>,
              children: <div className="ud-table"><Table dataSource={myRequests} columns={requestColumns} rowKey="id" loading={loading.requests} size="small" scroll={{ x: 600 }} pagination={{ pageSize: 20, size: 'small' }} tableLayout="auto" /></div>,
            },
            {
              key: 'transfers',
              label: <span style={{ fontSize: 13 }}>Transfers <Badge count={transfers.length} style={{ backgroundColor: '#722ed1', marginLeft: 4 }} size="small" /></span>,
              children: <div className="ud-table"><Table dataSource={transfers} columns={transferColumns} rowKey="id" loading={loading.transfers} size="small" scroll={{ x: 600 }} pagination={{ pageSize: 20, size: 'small' }} tableLayout="auto" /></div>,
            },
          ]}
        />
      </Card>

      <Modal title="Add New Machine" open={addModal} onCancel={() => { setAddModal(false); setNextMachineId(''); }} onOk={() => form.submit()} okText="Submit for Approval" width={520}>
        <Form form={form} onFinish={handleAddMachine} layout="vertical" initialValues={{ facility, section: 'SE' }} size="small"
          onValuesChange={(changed) => {
            if (changed.machineType) {
              const vals = form.getFieldsValue(['machineType']);
              fetchNextId(facility, vals.machineType);
            }
          }}
        >
          {nextMachineId && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, fontSize: 13 }}>
              Machine ID: <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>{nextMachineId}</strong>
            </div>
          )}
          <Row gutter={12}>
            <Col span={8}><Form.Item name="facility" label="Factory"><Input disabled /></Form.Item></Col>
            <Col span={8}><Form.Item name="machineType" label="Machine Type" rules={[{ required: true }]}><Select options={machineTypeOptions} showSearch optionFilterProp="label" popupMatchSelectWidth={false} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="section" label="Section" rules={[{ required: true }]}><Select options={sectionOptions} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="brand" label="Brand"><Input placeholder="JUKI" autoComplete="nope" /></Form.Item></Col>
            <Col span={12}><Form.Item name="modelNo" label="Model"><Input placeholder="DDL-8700-7" autoComplete="nope" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="mfgSerialNo" label="Serial No."><Input autoComplete="nope" /></Form.Item></Col>
            <Col span={12}><Form.Item name="year" label="Year"><Input placeholder="2006" autoComplete="nope" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="floor" label="Floor" rules={[{ required: true }]}><Select showSearch allowClear placeholder="Floor" options={suggestions.floors.map((f) => ({ value: f, label: f }))} /></Form.Item></Col>
            <Col span={8}><Form.Item name="line" label="Line"><Select showSearch allowClear placeholder="Line" options={suggestions.lines.map((l) => ({ value: l, label: l }))} /></Form.Item></Col>
            <Col span={8}><Form.Item name="remarks" label="Remarks"><Input autoComplete="nope" /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title={transferModal ? `Transfer — ${transferModal.machineId}` : 'Transfer'} open={!!transferModal} onCancel={() => { setTransferModal(null); setBasisValue(null); }} onOk={() => transferForm.submit()} okText="Submit Request" width={460}>
        {transferModal && (
          <div>
            <div style={{ marginBottom: 12, padding: 8, background: '#fafafa', borderRadius: 6, fontSize: 12 }}>
              <Row gutter={8}>
                <Col span={12}><span style={{ color: '#8c8c8c' }}>Asset ID:</span> <strong style={{ fontFamily: 'monospace' }}>{transferModal.machineId}</strong></Col>
                <Col span={12}><span style={{ color: '#8c8c8c' }}>Type:</span> <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{transferModal.machineType}</Tag></Col>
                <Col span={12}><span style={{ color: '#8c8c8c' }}>Location:</span> {transferModal.currentFacility}/{transferModal.currentFloor}</Col>
                <Col span={12}><span style={{ color: '#8c8c8c' }}>Machine:</span> <span style={{ fontFamily: 'monospace' }}>{transferModal.machineId}</span></Col>
              </Row>
            </div>
            <Form form={transferForm} onFinish={handleTransferRequest} layout="vertical" size="small">
              <Form.Item name="basis" label="Transfer Type" rules={[{ required: true }]}>
                <Select
                  options={[{ value: 'loan', label: 'Loan (Temporary)' }, { value: 'permanent', label: 'Permanent Transfer' }, { value: 'internal', label: 'Internal (Floor Change)' }]}
                  placeholder="Select"
                  onChange={(v) => { setBasisValue(v); if (v === 'internal') transferForm.setFieldsValue({ toFacility: facility }); }}
                />
              </Form.Item>
              {basisValue !== 'internal' && (
                <Row gutter={12}>
                  <Col span={12}><Form.Item name="toFacility" label="To Factory" rules={[{ required: true }]}><Select options={[{ value: 'AGL' }, { value: 'AJL' }, { value: 'ABM' }, { value: 'ASL' }].filter((o) => o.value !== facility)} placeholder="Select" /></Form.Item></Col>
                  <Col span={12}><Form.Item name="toFloor" label="To Floor" rules={[{ required: true }]}><Select showSearch allowClear placeholder="Floor" options={suggestions.floors.map((f) => ({ value: f, label: f }))} /></Form.Item></Col>
                </Row>
              )}
              {basisValue === 'internal' && (
                <Row gutter={12}>
                  <Col span={8}><Form.Item name="toFloor" label="To Floor" rules={[{ required: true }]}><Select showSearch allowClear placeholder="Floor" options={suggestions.floors.map((f) => ({ value: f, label: f }))} /></Form.Item></Col>
                  <Col span={8}><Form.Item name="toSection" label="To Section"><Select showSearch allowClear placeholder="Section" options={suggestions.sections.map((s) => ({ value: s, label: s }))} /></Form.Item></Col>
                  <Col span={8}><Form.Item name="toLine" label="To Line"><Select showSearch allowClear placeholder="Line" options={suggestions.lines.map((l) => ({ value: l, label: l }))} /></Form.Item></Col>
                </Row>
              )}
              {basisValue !== 'internal' && (
                <Row gutter={12}>
                  <Col span={12}><Form.Item name="toSection" label="To Section"><Select showSearch allowClear placeholder="Section" options={suggestions.sections.map((s) => ({ value: s, label: s }))} /></Form.Item></Col>
                  <Col span={12}><Form.Item name="toLine" label="To Line"><Select showSearch allowClear placeholder="Line" options={suggestions.lines.map((l) => ({ value: l, label: l }))} /></Form.Item></Col>
                </Row>
              )}
              {basisValue === 'loan' && (
                <Form.Item name="expectedReturnDate" label="Expected Return Date" rules={[{ required: true, message: 'Return date is required for loans' }]}>
                  <DatePicker style={{ width: '100%' }} disabledDate={(d) => d.isBefore(dayjs(), 'day')} placeholder="Select return date" />
                </Form.Item>
              )}
              <Form.Item name="reason" label="Reason" rules={[{ required: true }]}><Input.TextArea rows={2} placeholder="Why transfer this machine?" /></Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Modal title={null} open={!!detailModal} onCancel={() => setDetailModal(null)} footer={null} width={500}>
        {detailModal && (
          <div>
            <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 8 }}>Request Details</Typography.Title>
            {detailModal.status !== 'rejected' ? (
              <Steps current={approvalSteps.indexOf(detailModal.status)} items={approvalSteps.map((s) => ({ title: approvalStepLabels[s] }))} size="small" style={{ marginBottom: 16 }} />
            ) : (
              <div style={{ marginBottom: 16, textAlign: 'center' }}><Badge status="error" text={<Typography.Text type="danger" strong>REJECTED</Typography.Text>} /></div>
            )}
            <Row gutter={[12, 6]} style={{ fontSize: 13 }}>
              <Col span={12}><span style={{ color: '#8c8c8c', fontSize: 11 }}>Machine No</span><br /><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{detailModal.machineId}</span></Col>
              <Col span={12}><span style={{ color: '#8c8c8c', fontSize: 11 }}>Asset ID</span><br /><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{detailModal.machineId}</span></Col>
              <Col span={8}><span style={{ color: '#8c8c8c', fontSize: 11 }}>Section</span><br />{detailModal.section || 'SE'}</Col>
              <Col span={8}><span style={{ color: '#8c8c8c', fontSize: 11 }}>Type</span><br /><Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{detailModal.machineType}</Tag></Col>
              <Col span={8}><span style={{ color: '#8c8c8c', fontSize: 11 }}>Brand</span><br />{detailModal.brand || '—'}</Col>
              <Col span={12}><span style={{ color: '#8c8c8c', fontSize: 11 }}>Location</span><br />{detailModal.facility}/{detailModal.floor}{detailModal.line ? `/${detailModal.line}` : ''}</Col>
              <Col span={12}><span style={{ color: '#8c8c8c', fontSize: 11 }}>Submitted</span><br />{dayjs(detailModal.createdAt).format('DD MMM YYYY HH:mm')}</Col>
              {detailModal.firstApprovedAt && <Col span={12}><span style={{ color: '#8c8c8c', fontSize: 11 }}>WS Approved</span><br />{dayjs(detailModal.firstApprovedAt).format('DD MMM YYYY HH:mm')}</Col>}
              {detailModal.secondApprovedAt && <Col span={12}><span style={{ color: '#8c8c8c', fontSize: 11 }}>Admin Approved</span><br />{dayjs(detailModal.secondApprovedAt).format('DD MMM YYYY HH:mm')}</Col>}
            </Row>
            {detailModal.rejectionReason && (
              <div style={{ marginTop: 10, padding: 8, background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7', fontSize: 12 }}>
                <Typography.Text type="danger" strong style={{ fontSize: 11 }}>Reason:</Typography.Text> <Typography.Text type="danger">{detailModal.rejectionReason}</Typography.Text>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal title="Machine Details" open={!!machineDetailModal} onCancel={() => setMachineDetailModal(null)} footer={null} width={500}>
        {machineDetailModal && (
          <Row gutter={[12, 10]} style={{ fontSize: 13 }}>
            <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Machine No</Typography.Text><br /><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{machineDetailModal.machineId}</span></Col>
            <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Status</Typography.Text><br /><Badge status={(statusConfig[machineDetailModal.status]?.color || 'default') as any} text={statusConfig[machineDetailModal.status]?.label || machineDetailModal.status} /></Col>
            <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Section</Typography.Text><br />{machineDetailModal.section || 'SE'}</Col>
            <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Type</Typography.Text><br />{getMachineTypeDisplay(machineDetailModal.machineType).fullName}</Col>
            <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Brand</Typography.Text><br />{machineDetailModal.brand || '—'}</Col>
            <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Model</Typography.Text><br />{machineDetailModal.modelNo || '—'}</Col>
            <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Serial No</Typography.Text><br />{machineDetailModal.mfgSerialNo || '—'}</Col>
            <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Year</Typography.Text><br />{machineDetailModal.year || '—'}</Col>
            <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Factory</Typography.Text><br /><strong>{machineDetailModal.currentFacility || machineDetailModal.facility}</strong></Col>
            <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Floor</Typography.Text><br />{machineDetailModal.currentFloor || machineDetailModal.floor}</Col>
            <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Line</Typography.Text><br />{machineDetailModal.line || '—'}</Col>
            {machineDetailModal.remarks && <Col span={24}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Remarks</Typography.Text><br />{machineDetailModal.remarks}</Col>}
          </Row>
        )}
      </Modal>
    </div>
  );
}
