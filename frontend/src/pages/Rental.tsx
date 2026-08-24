import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Tag, Space, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const statusLabels: Record<string, string> = {
  requested: 'Requested', approved: 'Approved', denied: 'Denied', received: 'Received',
  condition_confirmed: 'Condition OK', in_use: 'In Use', return_requested: 'Return Requested',
  return_approved: 'Return Approved', returned: 'Returned',
};

export default function Rental() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [approveModal, setApproveModal] = useState<{ id: number; action: 'approve' | 'deny' } | null>(null);
  const [form] = Form.useForm();
  const [approveForm] = Form.useForm();
  const { isSuperAdmin, isAdmin } = useAuth();

  const load = () => {
    setLoading(true);
    api.get('/rental').then((res) => { setRentals(res.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (values: any) => {
    await api.post('/rental', values);
    message.success('Rental request submitted');
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const handleApproveAction = async (values: { justification: string }) => {
    if (!approveModal) return;
    await api.put(`/rental/${approveModal.id}/${approveModal.action}`, values);
    message.success(approveModal.action === 'approve' ? 'Rental approved' : 'Rental denied');
    setApproveModal(null);
    approveForm.resetFields();
    load();
  };

  const handleAction = async (id: number, action: string) => {
    await api.put(`/rental/${id}/${action}`);
    message.success('Rental updated');
    load();
  };

  const statusColor: Record<string, string> = {
    requested: 'blue', approved: 'cyan', denied: 'red', received: 'geekblue',
    condition_confirmed: 'purple', in_use: 'green', return_requested: 'orange',
    return_approved: 'lime', returned: 'default',
  };

  const columns = [
    { title: 'Machine Type', dataIndex: 'machineType', key: 'type' },
    { title: 'Model', dataIndex: 'model', key: 'model' },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', render: (v: string) => v || '—' },
    { title: 'Justification', dataIndex: 'justification', key: 'just', ellipsis: true },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColor[s]}>{statusLabels[s]}</Tag> },
    { title: 'Requested', dataIndex: 'requestedAt', key: 'time', render: (v: string) => dayjs(v).format('DD MMM HH:mm') },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'requested' && isSuperAdmin && (
            <>
              <Button size="small" type="primary" onClick={() => setApproveModal({ id: r.id, action: 'approve' })}>Approve</Button>
              <Button size="small" danger onClick={() => setApproveModal({ id: r.id, action: 'deny' })}>Deny</Button>
            </>
          )}
          {r.status === 'approved' && isAdmin && (
            <Button size="small" type="primary" onClick={() => handleAction(r.id, 'confirm-receipt')}>Confirm Receipt</Button>
          )}
          {r.status === 'received' && isSuperAdmin && (
            <Button size="small" type="primary" onClick={() => handleAction(r.id, 'confirm-condition')}>Confirm Condition</Button>
          )}
          {r.status === 'in_use' && (
            <Button size="small" onClick={() => handleAction(r.id, 'request-return')}>Request Return</Button>
          )}
          {r.status === 'return_requested' && isSuperAdmin && (
            <Button size="small" type="primary" onClick={() => handleAction(r.id, 'approve-return')}>Approve Return</Button>
          )}
          {r.status === 'return_approved' && isAdmin && (
            <Button size="small" type="primary" onClick={() => handleAction(r.id, 'confirm-return')}>Confirm Return</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Rental</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Request Rental</Button>
      </div>

      <Table dataSource={rentals} columns={columns} rowKey="id" loading={loading} size="small" />

      <Modal title="New Rental Request" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="Submit">
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="machineType" label="Machine Type" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="model" label="Model"><Input /></Form.Item>
          <Form.Item name="supplier" label="Supplier"><Input /></Form.Item>
          <Form.Item name="justification" label="Justification" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={approveModal?.action === 'approve' ? 'Approve Rental' : 'Deny Rental'}
        open={!!approveModal}
        onCancel={() => setApproveModal(null)}
        onOk={() => approveForm.submit()}
        okText={approveModal?.action === 'approve' ? 'Approve' : 'Deny'}
        okButtonProps={approveModal?.action === 'deny' ? { danger: true } : {}}
      >
        <Form form={approveForm} onFinish={handleApproveAction} layout="vertical">
          <Form.Item name="justification" label="Justification" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
