const userDao = require('../dao/userDao');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middlewares/auth');

// 登录（用工号）
const login = async (req, res) => {
  try {
    const { code, password } = req.body;
    if (!code || !password) {
      return res.status(400).json({ success: false, message: '工号和密码不能为空' });
    }

    const user = await userDao.findByCode(code);
    if (!user) {
      return res.status(401).json({ success: false, message: '工号或密码错误' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '工号或密码错误' });
    }

    await userDao.updateLastLogin(user.id);

    const token = generateToken({ id: user.id, code: user.code, name: user.name, role: user.role });
    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, code: user.code, name: user.name, role: user.role }
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await userDao.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
};

const createUser = async (req, res) => {
  try {
    const { code, name, password, role } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: '工号和姓名不能为空' });
    }
    if (await userDao.countByCode(code) > 0) {
      return res.status(400).json({ success: false, message: '工号已存在' });
    }

    // 密码未填则默认 123456
    const finalPassword = password || '123456';
    const passwordHash = await bcrypt.hash(finalPassword, 10);
    const id = await userDao.create(null, {
      code,
      name,
      password_hash: passwordHash,
      role: role || 'operator',
      created_user_id: req.user.id  // 记录创建人
    });
    res.status(201).json({ success: true, data: { id, code, name, role: role || 'operator' } });
  } catch (error) {
    console.error('创建用户失败:', error);
    // 返回具体错误信息，便于诊断（如数据库列不存在、唯一键冲突等）
    const msg = error && error.message ? error.message : '创建用户失败';
    res.status(500).json({ success: false, message: `创建用户失败: ${msg}` });
  }
};

// 修改自己的密码（旧密码 + 新密码）
const changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return res.status(400).json({ success: false, message: '请输入旧密码和新密码' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: '新密码至少 6 位' });
    }

    // req.user.code 来自 JWT，findByCode 返回含 password_hash 的完整行
    const user = await userDao.findByCode(req.user.code);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const isValid = await bcrypt.compare(old_password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ success: false, message: '旧密码错误' });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    await userDao.updatePassword(user.id, passwordHash);
    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    const msg = error && error.message ? error.message : '修改密码失败';
    res.status(500).json({ success: false, message: `修改密码失败: ${msg}` });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await userDao.findAll();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await userDao.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const { code, name, role, password } = req.body;
    const data = { code: code || user.code, name: name || user.name, role: role || user.role, modified_user_id: req.user.id };
    if (password) {
      data.password_hash = await bcrypt.hash(password, 10);
    }
    await userDao.update(null, req.params.id, data);
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ success: false, message: '更新用户失败' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await userDao.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: '不能删除自己' });
    }
    await userDao.remove(null, req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
};

// 重置用户密码为 12346
const resetPassword = async (req, res) => {
  try {
    const user = await userDao.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const passwordHash = await bcrypt.hash('12346', 10);
    await userDao.updatePassword(user.id, passwordHash);
    res.json({ success: true, message: '密码已重置为 12346' });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(500).json({ success: false, message: '重置密码失败' });
  }
};

module.exports = {
  login, getCurrentUser, createUser, changePassword, getUsers, updateUser, deleteUser, resetPassword
};
