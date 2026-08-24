import { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Button, message, Switch } from 'antd';
import { tankApi, systemApi } from '../../services/api';

export default function SystemSettings() {
  const [layoutForm] = Form.useForm();
  const [runtimeForm] = Form.useForm();
  const [savingRuntime, setSavingRuntime] = useState(false);

  const fetchLayout = async () => {
    try {
      const res: any = await tankApi.getLayout();
      layoutForm.setFieldsValue(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRuntime = async () => {
    try {
      const [timeoutRes, refreshRes, notifyRes]: any = await Promise.all([
        systemApi.getConfig('timeout_hours').catch(() => ({ success: false })),
        systemApi.getConfig('refresh_interval').catch(() => ({ success: false })),
        systemApi.getConfig('notify_timeout_enabled').catch(() => ({ success: false }))
      ]);
      runtimeForm.setFieldsValue({
        timeout_hours: timeoutRes.success ? parseInt(timeoutRes.data.config_value) || 4 : 4,
        refresh_interval: refreshRes.success ? parseInt(refreshRes.data.config_value) || 5 : 5,
        notify_timeout_enabled: notifyRes.success ? notifyRes.data.config_value === 'true' : true
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLayout();
    fetchRuntime();
  }, []);

  const handleLayoutSave = async () => {
    try {
      const values = await layoutForm.validateFields();
      await tankApi.updateLayout(values);
      message.success('布局保存成功');
      fetchLayout();
    } catch (error: any) {
      message.error(error.message || '保存失败');
    }
  };

  const handleRuntimeSave = async () => {
    try {
      const values = await runtimeForm.validateFields();
      setSavingRuntime(true);
      await Promise.all([
        systemApi.updateConfig('timeout_hours', { value: String(values.timeout_hours) }),
        systemApi.updateConfig('refresh_interval', { value: String(values.refresh_interval) }),
        systemApi.updateConfig('notify_timeout_enabled', { value: String(values.notify_timeout_enabled) })
      ]);
      message.success('运行参数保存成功');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSavingRuntime(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统设置</h2>

      <Card title="看板布局设置" style={{ marginBottom: 24 }}>
        <Form form={layoutForm} layout="inline">
          <Form.Item
            name="columns"
            label="列数"
            rules={[{ required: true, message: '请输入列数' }]}
          >
            <InputNumber min={1} max={10} />
          </Form.Item>
          <Form.Item
            name="rows"
            label="行数"
            rules={[{ required: true, message: '请输入行数' }]}
          >
            <InputNumber min={1} max={10} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleLayoutSave}>保存布局</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="运行参数设置">
        <Form form={runtimeForm} layout="inline">
          <Form.Item
            name="timeout_hours"
            label="超时阈值"
            rules={[{ required: true, message: '请输入超时阈值' }]}
            tooltip="流转卡挂卡超过此时间将标记为超时预警"
          >
            <InputNumber min={1} max={72} addonAfter="小时" />
          </Form.Item>
          <Form.Item
            name="refresh_interval"
            label="刷新间隔"
            rules={[{ required: true, message: '请输入刷新间隔' }]}
            tooltip="看板自动刷新数据的间隔时间"
          >
            <InputNumber min={3} max={60} addonAfter="秒" />
          </Form.Item>
          <Form.Item
            name="notify_timeout_enabled"
            label="超时通知"
            valuePropName="checked"
            tooltip="开启后，超时罐位在看板上高亮预警"
          >
            <Switch checkedChildren="开" unCheckedChildren="关" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={savingRuntime} onClick={handleRuntimeSave}>保存参数</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
