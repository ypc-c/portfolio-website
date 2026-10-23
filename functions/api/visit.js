// Cloudflare Pages Function —— 访客统计接口
// 路由：/api/visit  （GET）
// 需要绑定一个 KV 命名空间，变量名：VISITOR_KV
//   Dashboard → 项目 → Settings → Variables → KV namespace bindings → 添加 VISITOR_KV

// 网站上线日期，用于“运行时长(天)”统计（按 UTC 计算）
const LAUNCH_DATE = '2026-10-23';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // nv=1 表示这是一个“新访客”（之前从未访问过本站）
  // nvt=1 表示这是一个“今日新访客”（今天首次访问）
  const isNewVisitor = url.searchParams.get('nv') === '1';
  const isNewVisitorToday = url.searchParams.get('nvt') === '1';

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

  // 读取昨日/历史累计数据
  let stats = { total_visitors: 0, total_views: 0, today_visitors: 0, today_views: 0, date: todayStr };
  try {
    const raw = await kv.get('stats', { type: 'json' });
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

  // 累加（KV 为最终一致，低流量站点足够）
  stats.total_views = (Number(stats.total_views) || 0) + 1;
  stats.today_views = (Number(stats.today_views) || 0) + 1;
  if (isNewVisitor) stats.total_visitors = (Number(stats.total_visitors) || 0) + 1;
  if (isNewVisitorToday) stats.today_visitors = (Number(stats.today_visitors) || 0) + 1;

  try {
    await kv.put('stats', JSON.stringify(stats));
  } catch (e) {
    // 写入失败也不影响返回
  }

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
