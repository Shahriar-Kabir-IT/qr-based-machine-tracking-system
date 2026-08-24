import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const statusLabels: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', store_issued: 'Store Issued', installed: 'Installed',
};

export default function SpareParts() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [form] = Form.useForm();
  const { isSuperAdmin, isAdmin } = useAuth();

  const load = () => {
    setLoading(true);
    api.get('/spare-parts').then((res) => { setRequests(res.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openCreate = async () => {
    const res = await api.get('/machines', { params: { status: 'active' } });
    setMachines(res.data);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    const machine = machines.find((m: any) => m.id === values.machineId);
    await api.post('/spare-parts', {
      ...values,
      machineType: machine?.machineType,
      mfgSerialNo: machine?.mfgSerialNo,
    });
    message.success('Spare part request submitted');
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const handleAction = async (id: number, action: string) => {
    await api.put(`/spare-parts/${id}/${action}`);
    message.success('Status updated');
    load();
  };

  const statusColor: Record<string, string> = {
    pending: 'orange', approved: 'blue', store_issued: 'cyan', installed: 'green',
  };

  const columns = [
    { title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', render: (v: string) => v || 'N/A' },
    { title: 'Type', dataIndex: 'machineType', key: 'type' },
    { title: 'Part', dataIndex: 'part', key: 'part' },
    { title: 'Qty', dataIndex: 'qty', key: 'qty' },
    { title: 'Requested By', dataIndex: 'requestedBy', key: 'by' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColor[s]}>{statusLabels[s]}</Tag> },
    { title: 'Requested', dataIndex: 'requestedAt', key: 'time', render: (v: string) => dayjs(v).format('DD MMM HH:mm') },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'pending' && isSuperAdmin && (
            <Button size="small" type="primary" onClick={() => handleAction(r.id, 'approve')}>Approve</Button>
          )}
          {r.status === 'approved' && isAdmin && (
            <Button size="small" type="primary" onClick={() => handleAction(r.id, 'store-issue')}>Issue from Store</Button>
          )}
          {r.status === 'store_issued' && isSuperAdmin && (
            <Button size="small" type="primary" onClick={() => handleAction(r.id, 'install')}>Mark Installed</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Spare Parts</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Request Part</Button>
      </div>

      <Table dataSource={requests} columns={columns} rowKey="id" loading={loading} size="small" />

      <Modal title="Request Spare Part" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="Submit">
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="machineId" label="Machine" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select machine" optionFilterProp="label"
              options={machines.map((m: any) => ({ value: m.id, label: `${m.machineId} - ${m.machineType}` }))} />
          </Form.Item>
          <Form.Item name="part" label="Part Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="qty" label="Quantity" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="requestedBy" label="Requested By" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
