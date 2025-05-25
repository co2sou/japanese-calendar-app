const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// 初始化数据库
const db = new Database();

// 速率限制
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 100, // 每个IP每窗口期最多100次请求
  duration: 900, // 15分钟窗口
});

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 速率限制中间件
const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({ error: 'Too many requests' });
  }
};

app.use('/api', rateLimitMiddleware);

// JWT验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ============= API路由 =============

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await db.getUser(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await db.createUser(username, hashedPassword);
    
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, username });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await db.getUser(username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取用户事件
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const events = await db.getUserEvents(req.user.userId);
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建事件
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    const { date, event, startTime, endTime } = req.body;
    
    if (!date || !event || !startTime) {
      return res.status(400).json({ error: 'Date, event and start time are required' });
    }

    if (event.length > 16) {
      return res.status(400).json({ error: 'Event must be 16 characters or less' });
    }

    // 验证时间格式
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || (endTime && !timeRegex.test(endTime))) {
      return res.status(400).json({ error: 'Invalid time format' });
    }

    // 如果有结束时间，确保结束时间晚于开始时间
    if (endTime && endTime <= startTime) {
      return res.status(400).json({ error: 'End time must be later than start time' });
    }

    const eventId = await db.createEvent(req.user.userId, date, event, startTime, endTime);
    res.json({ id: eventId, date, event, start_time: startTime, end_time: endTime });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除事件
app.delete('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const deleted = await db.deleteEvent(req.user.userId, eventId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 服务静态文件
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
