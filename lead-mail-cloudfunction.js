/**
 * 留言通知云函数（腾讯云 SCF / 云开发）
 * 作用：接收网站留言 → 通过 QQ 邮箱 SMTP 转发到 976407556@qq.com
 *
 * ⚠️ 安全：授权码只存在服务端环境变量，绝不能写进前端代码
 *
 * 部署步骤：
 * 1. 腾讯云 → 云函数 SCF → 新建函数（Node.js 18）
 * 2. 环境变量添加：
 *    SMTP_USER   = qanvqjkgifbcbcbd@qq.com
 *    SMTP_PASS   = 你的QQ邮箱授权码（vnqkpakvxqkfbcii）
 *    MAIL_TO     = 976407556@qq.com
 *    SMTP_HOST   = smtp.qq.com
 *    SMTP_PORT   = 465
 * 3. 代码粘贴本文件并上传部署
 * 4. 前端在 index.html 的 <head> 里加：
 *    <script>window.__LEAD_API__ = 'https://你的云函数地址';</script>
 *
 * 依赖：npm i nodemailer
 */

const nodemailer = require('nodemailer');

const HOST = process.env.SMTP_HOST || 'smtp.qq.com';
const PORT = Number(process.env.SMTP_PORT || 465);
const USER = process.env.SMTP_USER || '';
const PASS = process.env.SMTP_PASS || '';
const MAIL_TO = process.env.MAIL_TO || '976407556@qq.com';

const transporter = nodemailer.createTransport({
  host: HOST,
  port: PORT,
  secure: PORT === 465,
  auth: { user: USER, pass: PASS },
});

function buildHtml(data) {
  const rows = [
    ['称呼', data.name || '（未填）'],
    ['联系方式', data.contact || '（未填）'],
    ['所在行业', data.industry || '（未填）'],
    ['企业规模', data.scale || '（未填）'],
    ['问题描述', data.msg || '（未填）'],
  ];
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f7fa;font-family:-apple-system,'Microsoft YaHei',sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);">
    <div style="background:linear-gradient(135deg,#1a5fb8,#2c7ad4);padding:20px 24px;color:#fff;">
      <h2 style="margin:0;font-size:18px;">网站新留言</h2>
      <p style="margin:6px 0 0;font-size:13px;opacity:.9;">${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rows.map(([k, v]) => `
        <tr>
          <td style="width:96px;padding:10px 0;color:#888;border-bottom:1px solid #f0f0f0;vertical-align:top;">${k}</td>
          <td style="padding:10px 0;color:#222;border-bottom:1px solid #f0f0f0;line-height:1.6;">${escapeHtml(v)}</td>
        </tr>`).join('')}
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#999;">
        来源页面：${escapeHtml((data.page || '').slice(0, 120))}
      </p>
    </div>
  </div>
</body></html>`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

exports.main = async (event) => {
  // CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      },
      body: '{}',
    };
  }

  let data = {};
  try {
    data = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || event);
  } catch (e) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: '{"ok":false,"msg":"bad json"}' };
  }

  if (!data.name && !data.contact && !data.msg) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: '{"ok":false,"msg":"empty"}' };
  }

  try {
    await transporter.sendMail({
      from: `"数智化团队网站" <${USER}>`,
      to: MAIL_TO,
      subject: `【网站留言】${data.name || '匿名'} — ${(data.msg || '').slice(0, 30) || '无描述'}`,
      text: [
        `称呼：${data.name || '（未填）'}`,
        `联系方式：${data.contact || '（未填）'}`,
        `行业：${data.industry || '（未填）'}`,
        `规模：${data.scale || '（未填）'}`,
        `问题：${data.msg || '（未填）'}`,
        `来源：${data.page || ''}`,
      ].join('\n'),
      html: buildHtml(data),
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{"ok":true}' };
  } catch (err) {
    console.error('SMTP 发送失败：', err && err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, msg: 'mail failed' }),
    };
  }
};