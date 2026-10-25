// Cloudflare Pages Function —— 留言板接口
// 路由：/api/guestbook（GET 读取今日留言 / POST 提交留言）
// 复用访客统计的 KV 命名空间，变量名：VISITOR_KV（Dashboard → 项目 → Settings → Bindings，
//   与 visit.js 是同一个绑定，无需新增配置）
//
// 规则：
//   - 全站共享：所有访客看到同一份留言
//   - 每天凌晨 12 点清空：以固定 UTC+8 为“天”的边界，键名 gb:<UTC+8 日期>，
//     跨天自然换键即等效清空；put 时带 expirationTtl，昨天的数据约 1 小时后自动过期删除
//   - 每天最多 10 条：写满后拒绝（返回 full:true），前端据此弹出提示
//   - 邮箱必填并校验格式，仅存入 KV 作为留言凭证；GET/POST 响应均不下发邮箱，页面不展示
//
// 一致性说明：KV 为最终一致，极端并发下可能瞬间多写 1~2 条，个人站点可接受；
//   写入时仍以 slice(0, MAX) 兜底。

const MAX = 10;
const KEY_PREFIX = 'gb:';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 取 UTC+8（Asia/Shanghai）日期串，作为全站统一的“天”
function dayStr(now) {
  return new Date(now.getTime() + 8 * 3600e3).toISOString().slice(0, 10);
}

// 距下一个 UTC+8 午夜的秒数（+1h 缓冲），用于 KV 自动过期清理旧键
function ttlToNextMidnight(now) {
  const shifted = Math.floor((now.getTime() + 8 * 3600e3) / 1000);
  return (Math.floor(shifted / 86400) + 1) * 86400 - shifted + 3600;
}

// 只返回展示所需字段，邮箱（e）一律不外泄
function publicMsgs(msgs) {
  return msgs.map(m => ({ n: m.n, t: m.t, time: m.time }));
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  const kv = env.VISITOR_KV;
  if (!kv) return json({ configured: false, max: MAX, messages: [] });

  let msgs = [];
  try {
    const raw = await kv.get(KEY_PREFIX + dayStr(new Date()), { type: 'json' });
    if (Array.isArray(raw)) msgs = raw;
  } catch (e) {
    // 读取失败按空列表继续，不阻断页面
  }
  return json({ configured: true, max: MAX, messages: publicMsgs(msgs) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const kv = env.VISITOR_KV;
  if (!kv) return json({ configured: false, ok: false, message: '留言板未配置存储' });

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, message: '请求格式错误' }, 400);
  }

  const name = String(body.name || '').trim().slice(0, 12);
  const email = String(body.email || '').trim().slice(0, 60);
  const text = String(body.text || '').trim().slice(0, 120);
  if (!email) return json({ ok: false, message: '请填写勇者邮箱' }, 400);
  if (!EMAIL_RE.test(email)) return json({ ok: false, message: '邮箱格式不正确' }, 400);
  if (!name) return json({ ok: false, message: '请填写勇者名号' }, 400);
  if (!text) return json({ ok: false, message: '留言内容不能为空' }, 400);

  const now = new Date();
  const key = KEY_PREFIX + dayStr(now);

  let msgs = [];
  try {
    const raw = await kv.get(key, { type: 'json' });
    if (Array.isArray(raw)) msgs = raw;
  } catch (e) {
    // 读取失败按空列表继续
  }

  if (msgs.length >= MAX) {
    return json({ ok: false, full: true, max: MAX, messages: publicMsgs(msgs) });
  }

  msgs.unshift({ n: name, t: text, e: email, time: now.getTime() });
  msgs = msgs.slice(0, MAX);
  try {
    await kv.put(key, JSON.stringify(msgs), { expirationTtl: ttlToNextMidnight(now) });
  } catch (e) {
    return json({ ok: false, message: '保存失败，请稍后再试' });
  }
  return json({ ok: true, messages: publicMsgs(msgs) });
}
