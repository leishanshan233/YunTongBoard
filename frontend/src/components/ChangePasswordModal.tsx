import { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { userApi } from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 修改密码弹窗（三端通用）
 * 旧密码 / 新密码 / 确认密码
 */
export default function ChangePasswordModal({ open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await userApi.changePassword(values.old_password, values.new_password);
      message.success('密码修改成功');
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (error: any) {
      // validateFields 失败为表单校验错误，不弹 message
      if (error?.errorFields) return;
      message.error(error.message || '修改失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="修改密码"
      open={open}
      onCancel={handleCancel}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={handleCancel}>取消</Button>,
        <Button key="ok" type="primary" loading={submitting} onClick={handleOk}>确定</Button>
      ]}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="old_password"
          label="旧密码"
          rules={[{ required: true, message: '请输入旧密码' }]}
        >
          <Input.Password placeholder="请输入旧密码" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '新密码至少 6 位' }
          ]}
        >
          <Input.Password placeholder="至少 6 位" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="确认密码"
          dependencies={['new_password']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              }
            })
          ]}
        >
          <Input.Password placeholder="再次输入新密码" autoComplete="off" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
