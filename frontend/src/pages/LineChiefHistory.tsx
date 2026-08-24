import { useEffect, useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Typography, message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const statusColor: Record<string, string> = {
  reported: 'orange', acknowledged: 'blue', repair_done: 'cyan', service_complete: 'green',
};
const statusLabel: Record<string, string> = {
  reported: 'Reported', acknowledged: 'Mechanic Working', repair_done: 'Repair Done', service_complete: 'Service Complete',
};

export default function LineChiefHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyModal, setVerifyModal] = useState<number | null>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get('/downtime').then((res) => {
      const filtered = res.data.filter((r: any) => {
        if (!user?.facility || !user?.floor) return true;
        const m = r.machine;
        if (!m) return true;
        return (m.currentFacility === user.facility || m.facility === user.facility) &&
               (m.currentFloor === user.floor || m.floor === user.floor);
      });
      setRecords(filtered);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (values: { verificationNote: string }) => {
    if (verifyModal === null) return;
    await api.put(`/downtime/${verifyModal}/verify`, values);
    message.success('Service verified');
    setVerifyModal(null);
    form.resetFields();
    load();
  };

  const columns = [
    { title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', render: (v: string) => v || 'N/A' },
    { title: 'Type', dataIndex: 'machineType', key: 'type' },
    { title: 'Line', dataIndex: 'line', key: 'line' },
    { title: 'Issue', dataIndex: 'issueDescription', key: 'issue', ellipsis: true },
    { title: 'Mechanic', dataIndex: 'mechanicName', key: 'mechanic', render: (v: string) => v || '—' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>,
    },
    { title: 'Reported', dataIndex: 'reportedAt', key: 'reported', render: (v: string) => dayjs(v).format('DD MMM HH:mm') },
    { title: 'Repair Time', dataIndex: 'repairDurationMinutes', key: 'repair', render: (v: number) => v != null ? `${v} min` : '—' },
    { title: 'Comment', dataIndex: 'verificationNote', key: 'comment', ellipsis: true, render: (v: string) => v || '—' },
    {
      title: 'Action', key: 'action',
      render: (_: any, r: any) => r.status === 'repair_done' ? (
        <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => setVerifyModal(r.id)}>
          Verify
        </Button>
      ) : null,
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <Typography.Title level={4} style={{ margin: '0 0 4px' }}>Service History</Typography.Title>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
        {user?.facility} / {user?.floor} Floor
      </Typography.Text>
      <Table dataSource={records} columns={columns} rowKey="id" loading={loading} size="small" scroll={{ x: 1100 }} />

      <Modal title="Verify Service Done" open={verifyModal !== null} onCancel={() => { setVerifyModal(null); form.resetFields(); }} onOk={() => form.submit()} okText="Confirm Service Done">
        <Form form={form} onFinish={handleVerify} layout="vertical">
          <Form.Item name="verificationNote" label="Verification Comment" rules={[{ required: true, message: 'Please add a comment' }]}>
            <Input.TextArea rows={3} placeholder="e.g. Checked machine, running smoothly now..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
