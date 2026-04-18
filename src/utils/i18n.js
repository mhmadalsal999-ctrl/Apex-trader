const ar = () => (process.env.BOT_LANGUAGE||'en')==='ar';

export const t = {
  welcome: () => ar()
    ? `🔥 *APEX — الوعي السيادي للفوركس*\n━━━━━━━━━━━━━━━━━━━━\n\nثلاثة عقول في كيان واحد\nيراقب الأسواق العالمية 24/7\n\n📋 *الأوامر المتاحة:*\n\n/market — وضع السوق الآن\n/session — الجلسة الحالية وبيانات السيولة\n/weekly — التحليل الأسبوعي\n/monthly — التحليل الشهري\n/yearly — النظرة الاستراتيجية السنوية\n/status — حالة البوت\n/language — تغيير اللغة (EN/AR)\n\n⚡ يرسل تنبيهات تلقائية عند أخبار مهمة\n⚠️ _للأغراض التعليمية فقط_`
    : `🔥 *APEX — Sovereign Forex Intelligence*\n━━━━━━━━━━━━━━━━━━━━\n\nThree minds. One system. No equal.\nMonitoring global markets 24/7\n\n📋 *Available Commands:*\n\n/market — Live market snapshot\n/session — Current session & liquidity data\n/weekly — Weekly analysis\n/monthly — Monthly analysis\n/yearly — Strategic yearly outlook\n/status — Bot status\n/language — Toggle language (EN/AR)\n\n⚡ Auto-alerts on high-impact news\n⚠️ _Educational analysis only_`,

  loading:    x  => ar() ? `⏳ جاري ${x}...` : `⏳ ${x}...`,
  error:      () => ar() ? '❌ خطأ — حاول مرة ثانية' : '❌ Error — please retry',
  notFound:   () => ar() ? '⚠️ التحليل غير متاح أو انتهت صلاحيته' : '⚠️ Analysis not available',
  disclaimer: () => ar() ? '⚠️ _هذا تحليل تعليمي وليس نصيحة استثمارية_'
                         : '⚠️ _Educational analysis only — not financial advice_',

  heatLabel:  () => ar() ? 'مؤشر الحرارة' : 'Heat Index',
  huntMode:   () => ar() ? '🎯 *Hunt Mode:* مفعّل'        : '🎯 *Hunt Mode:* ACTIVE',
  conflict:   () => ar() ? '⚠️ *تعارض في الإشارات*'       : '⚠️ *Signal Conflict Detected*',
  vetoed:     () => ar() ? '🚫 *APEX — الأطروحة مرفوضة*' : '🚫 *APEX — THESIS VETOED*',
  bullish:    () => ar() ? '✅ *شراء*'  : '✅ *BUY*',
  bearish:    () => ar() ? '❌ *بيع*'   : '❌ *SELL*',
  neutral:    () => ar() ? '⚪ *محايد*' : '⚪ *NEUTRAL*',

  btn: {
    full:       () => ar() ? '🔍 تحليل كامل'        : '🔍 Full Analysis',
    technical:  () => ar() ? '📊 تقني ICT/SMC'      : '📊 Technical ICT/SMC',
    dna:        () => ar() ? '🧬 DNA + سلسلة سببية' : '🧬 DNA + Causal Chain',
    historical: () => ar() ? '📚 سابقة تاريخية'     : '📚 Historical Match',
    smartMoney: () => ar() ? '💎 Smart Money'       : '💎 Smart Money',
    mtf:        () => ar() ? '🔭 MTF كامل'          : '🔭 Full MTF',
    session:    () => ar() ? '🕐 الجلسة الحالية'    : '🕐 Current Session',
    weekly:     () => ar() ? '📅 أسبوعي'            : '📅 Weekly',
    monthly:    () => ar() ? '🗓️ شهري'             : '🗓️ Monthly',
    yearly:     () => ar() ? '📆 سنوي'             : '📆 Yearly',
  }
};

// ─── Session data ──────────────────────────────────────────────────────────────
export function getCurrentSession() {
  const h = new Date().getUTCHours();
  if (h>=0  && h<7)  return ar() ? 'جلسة طوكيو 🇯🇵'              : 'Tokyo Session 🇯🇵';
  if (h>=7  && h<12) return ar() ? 'جلسة لندن 🇬🇧 — أعلى سيولة'  : 'London Session 🇬🇧 — Peak Liquidity';
  if (h>=12 && h<17) return ar() ? 'تداخل لندن/نيويورك ⚡'        : 'London/NY Overlap ⚡';
  if (h>=17 && h<22) return ar() ? 'جلسة نيويورك 🇺🇸'             : 'New York Session 🇺🇸';
  return ar() ? 'جلسة هادئة 🌙' : 'Quiet Session 🌙';
}

export function getSessionDetails() {
  const h   = new Date().getUTCHours();
  const isAr = ar();
  const now  = new Date().toUTCString();

  let session, open, liquidity, activePairs, volatility, notes, killZone;

  if (h >= 0 && h < 7) {
    session    = isAr ? 'طوكيو / آسيا' : 'Tokyo / Asia';
    open       = '00:00 – 07:00 UTC';
    liquidity  = isAr ? 'منخفضة إلى متوسطة' : 'Low to Medium';
    volatility = isAr ? 'منخفضة' : 'Low';
    activePairs= 'USD/JPY • AUD/USD • NZD/USD • AUD/JPY';
    killZone   = '00:00 – 02:00 UTC';
    notes      = isAr
      ? 'حركة الين الأكثر أهمية. البنك المركزي الياباني (BOJ) يتدخل أحياناً. تجنب الأزواج الأوروبية.'
      : 'JPY pairs most active. BOJ interventions most common. Avoid EUR/GBP pairs.';
  } else if (h >= 7 && h < 12) {
    session    = isAr ? 'لندن' : 'London';
    open       = '07:00 – 12:00 UTC';
    liquidity  = isAr ? 'عالية جداً — أكبر جلسة في العالم' : 'Very High — Largest global session';
    volatility = isAr ? 'عالية' : 'High';
    activePairs= 'EUR/USD • GBP/USD • EUR/GBP • USD/CHF • XAU/USD';
    killZone   = '08:00 – 10:00 UTC';
    notes      = isAr
      ? 'أعلى سيولة في العالم. معظم الاتجاهات الكبيرة تبدأ هنا. ICT Kill Zone نشطة.'
      : 'Highest global liquidity. Major trends start here. ICT Kill Zone is active.';
  } else if (h >= 12 && h < 17) {
    session    = isAr ? 'تداخل لندن / نيويورك' : 'London / New York Overlap';
    open       = '12:00 – 17:00 UTC';
    liquidity  = isAr ? 'أقصى سيولة ممكنة' : 'Maximum Liquidity';
    volatility = isAr ? 'عالية جداً — أخطر وقت' : 'Very High — Most Dangerous Window';
    activePairs= 'ALL MAJORS — EUR/USD • USD/JPY • XAU/USD • GBP/USD';
    killZone   = '13:00 – 15:00 UTC';
    notes      = isAr
      ? 'أكبر تحركات السعر في اليوم. معظم الأخبار المهمة تصدر هنا. تقليل حجم المراكز.'
      : 'Largest price moves of the day. Most high-impact news releases here. Reduce position size.';
  } else if (h >= 17 && h < 22) {
    session    = isAr ? 'نيويورك' : 'New York';
    open       = '17:00 – 22:00 UTC';
    liquidity  = isAr ? 'عالية — تتراجع تدريجياً' : 'High — Gradually Declining';
    volatility = isAr ? 'متوسطة إلى عالية' : 'Medium to High';
    activePairs= 'USD/CAD • USD/JPY • GBP/USD • XAU/USD';
    killZone   = '13:00 – 15:00 UTC (finished)';
    notes      = isAr
      ? 'سيولة جيدة في البداية. تراجع تدريجي بعد 20:00 UTC. أخبار أمريكية مهمة في بداية الجلسة.'
      : 'Good liquidity early. Gradual decline after 20:00 UTC. Watch for US economic releases.';
  } else {
    session    = isAr ? 'جلسة هادئة' : 'Quiet Period';
    open       = '22:00 – 00:00 UTC';
    liquidity  = isAr ? 'منخفضة جداً' : 'Very Low';
    volatility = isAr ? 'منخفضة جداً' : 'Very Low';
    activePairs= isAr ? 'لا يُنصح بالتداول' : 'Not recommended for trading';
    killZone   = isAr ? 'لا يوجد' : 'None active';
    notes      = isAr
      ? 'أقل وقت سيولة. تجنب فتح مراكز جديدة. انتظر جلسة طوكيو.'
      : 'Lowest liquidity period. Avoid new positions. Wait for Tokyo open.';
  }

  const L = isAr ? {
    title:'الجلسة الحالية', time:'الوقت الحالي', open:'ساعات العمل',
    liq:'السيولة', vol:'التقلب', pairs:'الأزواج النشطة',
    kz:'Kill Zone', notes:'ملاحظات مهمة'
  } : {
    title:'Current Session', time:'Current Time', open:'Session Hours',
    liq:'Liquidity', vol:'Volatility', pairs:'Active Pairs',
    kz:'ICT Kill Zone', notes:'Key Notes'
  };

  return `🕐 *${L.title}: ${session}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⏰ *${L.time}:* ${now}\n` +
    `🕒 *${L.open}:* ${open}\n` +
    `💧 *${L.liq}:* ${liquidity}\n` +
    `⚡ *${L.vol}:* ${volatility}\n` +
    `📊 *${L.pairs}:*\n${activePairs}\n` +
    `🎯 *${L.kz}:* ${killZone}\n\n` +
    `📝 *${L.notes}:*\n_${notes}_\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    t.disclaimer();
}
