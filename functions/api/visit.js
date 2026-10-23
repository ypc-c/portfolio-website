// Cloudflare Pages Function —— 访客统计接口
// 路由：/api/visit  （GET）
// 需要绑定一个 KV 命名空间，变量名：VISITOR_KV
//   Dashboard → 项目 → Settings → Bindings → 添加 KV namespace，变量名 VISITOR_KV
//
// 统计口径：
//   - 浏览量：每次请求 +1（按“打开次数”计，不去重）
//   - 访客：服务端按 客户端IP + User-Agent 哈希去重
//        · 同一 IP+UA 终身只计 1 个“累计访客”（vlife:<hash>）
//        · 同一 IP+UA 当日只计 1 个“今日访客”（vday:<hash>:<日期>，24h 自动过期）
//     说明：同一 WiFi 下手机与电脑 UA 不同 → 各算 1；移动网络换 IP → 会重新计（属正常）。

// 网站上线日期，用于“运行时长(天)”统计（按 UTC 计算）
const LAUNCH_DATE = '2026-10-23';

// 自 v2 起改用新键名，旧 stats 键数据作废，等效于把计数器清零（C 方案）
const KEY_STATS = 'stats_v2';

// 取客户端去重键：IP + UA 简单哈希
function getClientKey(request) {
  const cfIp = request.headers.get('CF-Connecting-IP');
  const xff = request.headers.get('x-forwarded-for') || '';
  const ip = cfIp || (xff.split(',')[0] || '').trim() || 'unknown';
  const ua = request.headers.get('user-agent') || '';
  const s = ip + '|' + ua;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const uptimeDays = Math.max(
    0,
    Math.floor((now - new Date(LAUNCH_DATE + 'T00:00:00Z')) / 86400000)
  );

  const kv = env.VISITOR_KV;

  // KV 未绑定时的降级：返回 configured:false，前端显示 “—”
  if (!kv) {
    return new Response(
      JSON.stringify({ configured: false, uptime_days: uptimeDays }),
      { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }
    );
  }

  // 读取累计数据
  let stats = { total_visitors: 0, total_views: 0, today_visitors: 0, today_views: 0, date: todayStr };
  try {
    const raw = await kv.get(KEY_STATS, { type: 'json' });
    if (raw && typeof raw === 'object') stats = raw;
  } catch (e) {
    // 读取失败则用默认值继续，不阻断页面
  }

  // 跨天重置“今日”计数器
  if (stats.date !== todayStr) {
    stats.date = todayStr;
    stats.today_visitors = 0;
    stats.today_views = 0;
  }

  // 服务端去重：判断是否为“新访客 / 今日新访客”
  const ck = getClientKey(request);
  let isNewVisitor = true;
  let isNewVisitorToday = true;
  try {
    if (await kv.get('vlife:' + ck)) isNewVisitor = false;
    if (await kv.get('vday:' + ck + ':' + todayStr)) isNewVisitorToday = false;
  } catch (e) {
    // 去重键读取失败时不阻断，按新访客计（最坏多计，不影响页面）
  }

  // 累加（KV 为最终一致，低流量站点足够；并发可能少量漏计，可接受）
  stats.total_views = (Number(stats.total_views) || 0) + 1;
  stats.today_views = (Number(stats.today_views) || 0) + 1;
  if (isNewVisitor) stats.total_visitors = (Number(stats.total_visitors) || 0) + 1;
  if (isNewVisitorToday) stats.today_visitors = (Number(stats.today_visitors) || 0) + 1;

  try {
    await kv.put(KEY_STATS, JSON.stringify(stats));
  } catch (e) {
    // 写入失败也不影响返回
  }

  // 写入去重标记（best-effort）
  const marks = [];
  if (isNewVisitor) marks.push(kv.put('vlife:' + ck, '1').catch(() => {}));
  if (isNewVisitorToday) marks.push(kv.put('vday:' + ck + ':' + todayStr, '1', { expirationTtl: 86400 }).catch(() => {}));
  await Promise.all(marks);

  return new Response(
    JSON.stringify({
      configured: true,
      total_visitors: stats.total_visitors,
      total_views: stats.total_views,
      today_visitors: stats.today_visitors,
      today_views: stats.today_views,
      uptime_days: uptimeDays
    }),
    { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }
  );
}
