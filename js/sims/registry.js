// سجل المحاكيات: التعريف + المهام + التحميل الكسول
export const SIMS = [
  {
    id: 'density', icon: 'test-tube', unit: 'u1',
    title: 'مختبر الكثافة',
    desc: 'خزان وسوائل حقيقية: احسب ρ و γ و SG بنفسك',
    missions: [
      { id: 'vol10', text: 'غيّر أبعاد الخزان حتى يتجاوز حجمه 10 m³' },
      { id: 'mercury', text: 'اختر سائلًا كثافته أكبر من 13000 kg/m³' },
    ],
  },
  {
    id: 'viscosity', icon: 'droplets', unit: 'u1',
    title: 'سباق اللزوجة',
    desc: 'كرات تسقط في ماء وزيت وعسل — من يصل أولًا؟',
    missions: [
      { id: 'predict', text: 'خمّن الفائز قبل انطلاق السباق وأصِب' },
      { id: 'heat', text: 'سخّن السوائل وشاهد كيف يتغير السباق' },
    ],
  },
  {
    id: 'boiling', icon: 'flame', unit: 'u1',
    title: 'الغليان وضغط البخار',
    desc: 'لماذا يغلي الماء بدون تسخين؟ سرّ التكهف يبدأ هنا',
    missions: [
      { id: 'boil60', text: 'اجعل الماء يغلي عند أقل من 60°C بتخفيض الضغط' },
      { id: 'cavit', text: 'شاهد فقاعات التكهف عند مدخل المضخة' },
    ],
  },
  {
    id: 'pressure', icon: 'gauge', unit: 'u2',
    title: 'الغوّاص والضغط',
    desc: 'انزل في الأعماق وشاهد P = ρgh أمام عينيك',
    missions: [
      { id: 'deep300', text: 'انزل بالغواص حتى يتجاوز الضغط 300 kPa' },
      { id: 'hgcol', text: 'بدّل إلى الزئبق ولاحظ انكماش العمود المكافئ' },
    ],
  },
  {
    id: 'hydraulic', icon: 'piston', unit: 'u2',
    title: 'المكبس الهيدروليكي',
    desc: 'ارفع سيارة بيد واحدة — قاعدة باسكال في العمل',
    missions: [
      { id: 'lift', text: 'ارفع السيارة بقوة يد لا تتجاوز 100 N' },
      { id: 'ratio50', text: 'حقق فائدة آلية 50 أو أكثر' },
    ],
  },
  {
    id: 'buoyancy', icon: 'ship', unit: 'u2',
    title: 'مختبر الطفو',
    desc: 'يطفو، يتعلق، أم يغوص؟ قاعدة أرشميدس بين يديك',
    missions: [
      { id: 'ironfloat', text: 'اجعل قطعة الحديد تطفو (غيّر السائل!)' },
      { id: 'neutral', text: 'حقق حالة التعلق: الجسم لا يطفو ولا يغوص' },
    ],
  },
  {
    id: 'manometer', icon: 'manometer', unit: 'u2',
    title: 'المانوميتر U',
    desc: 'اقرأ الضغط من فرق عمودَي الزئبق كما في الورشة',
    missions: [
      { id: 'read200', text: 'اضبط الضغط حتى يبلغ فرق العمودين 200 mm تقريبًا' },
      { id: 'vacuum', text: 'طبّق تفريغًا واجعل العمود ينعكس' },
    ],
  },
  {
    id: 'continuity', icon: 'pipe', unit: 'u3',
    title: 'الأنبوب اللامّ',
    desc: 'ضيّق الخرطوم بإصبعك وشاهد السرعة تنطلق: A×v ثابت',
    missions: [
      { id: 'x4', text: 'ضيّق المخرج حتى تتضاعف السرعة 4 مرات' },
      { id: 'q50', text: 'حقق تدفقًا قدره 50 لتر/ثانية تقريبًا' },
    ],
  },
  {
    id: 'bernoulli', icon: 'zap', unit: 'u3',
    title: 'خزان برنولي',
    desc: 'طاقة الوضع والضغط والحركة تتحول أمامك في خزان بفتحة',
    missions: [
      { id: 'jet7', text: 'ارفع مستوى الماء حتى تتجاوز سرعة النفث 7 m/s' },
      { id: 'pointc', text: 'اضغط نقطة النافورة C: أين ذهبت طاقة الضغط؟' },
    ],
  },
  {
    id: 'venturi', icon: 'hourglass', unit: 'u3',
    title: 'فنشوري وبيتوت',
    desc: 'قِس التدفق والسرعة كما تفعل أجهزة الورشة الحقيقية',
    missions: [
      { id: 'dm100', text: 'زد التدفق حتى يتجاوز فرق المانوميتر 100 mm' },
      { id: 'pitot', text: 'بدّل إلى أنبوب بيتوت وقس سرعة التيار' },
    ],
  },
  {
    id: 'reynolds', icon: 'tornado', unit: 'u4',
    title: 'آلة رينولدز',
    desc: 'رقائقي أم مضطرب؟ أربعة منزلقات تتحكم في مصير الجريان',
    missions: [
      { id: 'laminar', text: 'حقق جريانًا رقائقيًا: Re أقل من 2100' },
      { id: 'turb', text: 'اجعل جريان الماء مضطربًا: Re فوق 10000' },
      { id: 'oilmax', text: 'اختر الزيت وارفع السرعة للحد الأقصى — هل يضطرب؟' },
    ],
  },
  {
    id: 'friction', icon: 'trending-down', unit: 'u4',
    title: 'مستكشف فقد الضغط',
    desc: 'الطول والقطر والسرعة والصدأ: من يسرق ضغط مضختك؟',
    missions: [
      { id: 'v2x', text: 'ضاعف السرعة ولاحظ الفقد يتضاعف 4 مرات' },
      { id: 'age20', text: 'قدّم عمر الأنبوب 20 سنة وراقب أثر الصدأ' },
      { id: 'choke', text: 'أغلق الجارور إلى ربع فتحة وشاهد الاختناق' },
    ],
  },
  {
    id: 'fan', icon: 'fan', unit: 'u4',
    title: 'مجرى الهواء والمروحة',
    desc: 'صمّم مجرى تهوية واختر قدرة المروحة P = Δp × Q',
    missions: [
      { id: 'kw1', text: 'اضبط المجرى وارفع التدفق حتى تتجاوز قدرة المروحة 1 kW' },
      { id: 'shape', text: 'قارن مجرى مربعًا بمسطّح عريض بنفس المساحة — أيهما أوفر؟' },
    ],
  },
  {
    id: 'pump', icon: 'pump', unit: 'u4',
    title: 'منظومة الضخ',
    desc: 'شغّل مضخة حقيقية: نقطة التشغيل، الكفاءة، وخطر التكهف',
    missions: [
      { id: 'q20', text: 'حقق التدفق المطلوب: 20 لتر/ثانية' },
      { id: 'cavit', text: 'تسبب في التكهف بخنق السحب… ثم عالجه!' },
      { id: 'sweet', text: 'اضبط التشغيل قرب أعلى كفاءة للمضخة' },
    ],
  },
];

const loaders = {
  density: () => import('./density.js'),
  viscosity: () => import('./viscosity.js'),
  boiling: () => import('./boiling.js'),
  pressure: () => import('./pressure.js'),
  hydraulic: () => import('./hydraulic.js'),
  buoyancy: () => import('./buoyancy.js'),
  manometer: () => import('./manometer.js'),
  continuity: () => import('./continuity.js'),
  bernoulli: () => import('./bernoulli.js'),
  venturi: () => import('./venturi.js'),
  reynolds: () => import('./reynolds.js'),
  friction: () => import('./friction.js'),
  fan: () => import('./fan.js'),
  pump: () => import('./pump.js'),
};

export function loadSim(id) {
  const l = loaders[id];
  return l ? l() : Promise.resolve(null);
}
