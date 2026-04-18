const ar = () => (process.env.BOT_LANGUAGE || 'en') === 'ar';

export const t = {
  welcome:    () => ar()
    ? `🔥 *APEX — الوعي السيادي للفوركس v3*\n\nثلاثة عقول في كيان واحد\n\n/market — السوق الآن\n/session — الجلسة الحالية\n/weekly — أسبوعي\n/monthly — شهري\n/yearly — سنوي\n/status — حالة البوت\n/language — تغيير اللغة`
    : `🔥 *APEX — Sovereign Forex Intelligence v3*\n\nThree minds. One system. No equal.\n\n/market — Live snapshot\n/session — Current session\n/weekly — Weekly analysis\n/monthly — Monthly analysis\n/yearly — Yearly outlook\n/status — Bot status\n/language — Toggle language`,

  loading:    (x) => ar() ? `⏳ جاري ${x}...` : `⏳ Loading ${x}...`,
  error:      ()  => ar() ? '❌ خطأ — حاول مرة ثانية' : '❌ Error — please retry',
  notFound:   ()  => ar() ? '⚠️ التحليل غير متاح' : '⚠️ Analysis not available',
  disclaimer: ()  => ar()
    ? '⚠️ _هذا تحليل تعليمي وليس نصيحة استثمارية_'
    : '⚠️ _Educational analysis only — not financial advice_',

  heatLabel:  () => ar() ? 'مؤشر الحرارة' : 'Heat Index',
  huntMode:   () => ar() ? '🎯 Hunt Mode: مفعّل' : '🎯 Hunt Mode: ACTIVE',
  conflict:   () => ar() ? '⚠️ تعارض في الإشارات' : '⚠️ Signal Conflict Detected',
  vetoed:     () => ar() ? '🚫 APEX — الأطروحة مرفوضة' : '🚫 APEX — THESIS VETOED',
  bullish:    () => ar() ? '✅ شراء' : '✅ BUY',
  bearish:    () => ar() ? '❌ بيع'  : '❌ SELL',
  neutral:    () => ar() ? '⚪ محايد' : '⚪ NEUTRAL',

  btn: {
    full:       () => ar() ? '🔍 تحليل كامل'       : '🔍 Full Analysis',
    technical:  () => ar() ? '📊 تقني ICT/SMC'     : '📊 Technical ICT/SMC',
    dna:        () => ar() ? '🧬 DNA + سلسلة سببية': '🧬 DNA + Causal Chain',
    historical: () => ar() ? '📚 سابقة تاريخية'    : '📚 Historical Match',
    smartMoney: () => ar() ? '💎 Smart Money'      : '💎 Smart Money',
    mtf:        () => ar() ? '🔭 MTF كامل'         : '🔭 Full MTF',
    session:    () => ar() ? '🕐 الجلسة الحالية'   : '🕐 Current Session',
    weekly:     () => ar() ? '📅 أسبوعي'           : '📅 Weekly',
    monthly:    () => ar() ? '🗓️ شهري'            : '🗓️ Monthly',
    yearly:     () => ar() ? '📆 سنوي'             : '📆 Yearly',
  }
};

// ─── Trading Session Logic ─────────────────────────────────────────────────

export function getCurrentSession() {
  const h = new Date().getUTCHours();
  if (h >= 22 || h < 7)  return ar() ? 'جلسة طوكيو/آسيا 🇯🇵'              : 'Tokyo/Asia Session 🇯🇵';
  if (h >= 7  && h < 12) return ar() ? 'جلسة لندن 🇬🇧 — أعلى سيولة'        : 'London Session 🇬🇧 — Peak Liquidity';
  if (h >= 12 && h < 17) return ar() ? 'تداخل لندن/نيويورك ⚡ — أعلى تقلب' : 'London/NY Overlap ⚡ — Peak Volatility';
  if (h >= 17 && h < 22) return ar() ? 'جلسة نيويورك 🇺🇸'                  : 'New York Session 🇺🇸';
  return ar() ? 'جلسة هادئة 🌙' : 'Quiet Session 🌙';
}

export function getSessionDetails() {
  const h   = new Date().getUTCHours();
  const utc = new Date().toUTCString();
  const isAr = ar();

  let name, liquidity, pairs, notes;

  if (h >= 22 || h < 7) {
    name      = isAr ? 'طوكيو/آسيا (00:00–07:00 UTC)' : 'Tokyo/Asia (00:00–07:00 UTC)';
    liquidity = isAr ? 'منخفضة إلى متوسطة' : 'Low to Medium';
    pairs     = 'USD/JPY, AUD/USD, NZD/USD, AUD/JPY';
    notes     = isAr ? 'تحركات الين الأكثر أهمية هنا. BOJ يتدخل أحياناً في هذه الجلسة.'
                     : 'JPY pairs most active. BOJ interventions most common here.';
  } else if (h >= 7 && h < 12) {
    name      = isAr ? 'لندن (07:00–12:00 UTC)' : 'London (07:00–12:00 UTC)';
    liquidity = isAr ? 'عالية جداً — أكبر جلسة' : 'Very High — Largest Session';
    pairs     = 'EUR/USD, GBP/USD, EUR/GBP, USD/CHF';
    notes     = isAr ? 'أعلى سيولة في العالم. معظم الاتجاهات الكبيرة تبدأ هنا. ICT Kill Zone.'
                     : 'Highest global liquidity. Major trends start here. ICT Kill Zone active.';
  } else if (h >= 12 && h < 17) {
    name      = isAr ? 'تداخل لندن/نيويورك (12:00–17:00 UTC)' : 'London/NY Overlap (12:00–17:00 UTC)';
    liquidity = isAr ? 'أقصى سيولة — الأخطر' : 'Maximum Liquidity — Highest Volatility';
    pairs     = 'ALL MAJORS — especially EUR/USD, USD/JPY, XAU/USD';
    notes     = isAr ? 'أخطر وقت في اليوم. أكبر تحركات السعر. معظم الأخبار المهمة تصدر هنا.'
                     : 'Most dangerous window. Largest price moves. Most high-impact news releases here.';
  } else {
    name      = isAr ? 'نيويورك (17:00–22:00 UTC)' : 'New York (17:00–22:00 UTC)';
    liquidity = isAr ? 'عالية — تتراجع تدريجياً' : 'High — Gradually Declining';
    pairs     = 'USD/CAD, USD/JPY, GBP/USD, XAU/USD';
    notes     = isAr ? 'سيولة جيدة في البداية. تراجع تدريجي بعد الساعة 20:00 UTC.'
                     : 'Good liquidity early. Gradual decline after 20:00 UTC.';
  }

  const label = isAr ? {
    session: 'الجلسة', time: 'الوقت الحالي', liquidity: 'السيولة',
    activePairs: 'الأزواج النشطة', notes: 'ملاحظات'
  } : {
    session: 'Session', time: 'Current Time', liquidity: 'Liquidity',
    activePairs: 'Active Pairs', notes: 'Notes'
  };

  return `🕐 *${label.session}: ${name}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ *${label.time}:* ${utc}\n` +
    `💧 *${label.liquidity}:* ${liquidity}\n` +
    `📊 *${label.activePairs}:* ${pairs}\n` +
    `📝 *${label.notes}:* ${notes}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    t.disclaimer();
}
