/* ===== Panel Schedule engine — IEC 60364-5-52 / SBC 401 basis ===== */
const ENG = (() => {
  const SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
  // Copper conductor DC resistance at 20°C (Ω/km), IEC 60228 class 2
  const R20 = [12.1, 7.41, 4.61, 3.08, 1.83, 1.15, 0.727, 0.524, 0.387, 0.268, 0.193, 0.153, 0.124, 0.0991, 0.0754, 0.0601];
  const X_KM = 0.08;
  // Current-carrying capacity, copper, IEC 60364-5-52 Annex B (A). [method][insulation][loaded conductors]
  const AMP = {
    B1: { PVC: { 2: [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269, 300, 341, 400, 458], 3: [15.5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239, 262, 296, 346, 394] },
          XLPE: { 2: [23, 31, 42, 54, 75, 100, 133, 164, 198, 253, 306, 354], 3: [20, 28, 37, 48, 66, 88, 117, 144, 175, 222, 269, 312, 342, 384, 450, 514] } },
    B2: { PVC: { 2: [16.5, 23, 30, 38, 52, 69, 90, 111, 133, 168, 201, 232, 258, 294, 344, 394], 3: [15, 20, 27, 34, 46, 62, 80, 99, 118, 149, 179, 206, 225, 255, 297, 339] },
          XLPE: { 2: [22, 30, 40, 51, 69, 91, 119, 146, 175, 221, 265, 305], 3: [19.5, 26, 35, 44, 60, 80, 105, 128, 154, 194, 233, 268, 300, 340, 398, 455] } },
    C:  { PVC: { 2: [19.5, 27, 36, 46, 63, 85, 112, 138, 168, 213, 258, 299, 344, 392, 461, 530], 3: [17.5, 24, 32, 41, 57, 76, 96, 119, 144, 184, 223, 259, 299, 341, 403, 464] },
          XLPE: { 2: [24, 33, 45, 58, 80, 107, 138, 171, 209, 269, 328, 382, 441, 506, 599, 693], 3: [22, 30, 40, 52, 71, 96, 119, 147, 179, 229, 278, 322, 371, 424, 500, 576] } },
    E:  { PVC: { 2: [22, 30, 40, 51, 70, 94, 119, 148, 180, 232, 282, 328, 379, 434, 514, 593], 3: [18.5, 25, 34, 43, 60, 80, 101, 126, 153, 196, 238, 276, 319, 364, 430, 497] },
          XLPE: { 2: [26, 36, 49, 63, 86, 115, 149, 185, 225, 289, 352, 410, 473, 542, 641, 741], 3: [23, 32, 42, 54, 75, 100, 127, 158, 192, 246, 298, 346, 399, 456, 538, 621] } },
    D:  { PVC: { 2: [22, 29, 37, 46, 60, 78, 99, 119, 140, 173, 204, 231, 261, 292, 336, 379], 3: [18, 24, 30, 38, 50, 64, 82, 98, 116, 143, 169, 192, 217, 243, 280, 316] },
          XLPE: { 2: [25, 33, 43, 53, 71, 91, 116, 139, 164, 203, 239, 271, 306, 343, 395, 446], 3: [21, 28, 36, 44, 58, 75, 96, 115, 135, 167, 197, 223, 251, 281, 324, 365] } },
    // D2: direct in ground. XLPE 2-loaded not in the verified extract: the 3-loaded column is used (conservative).
    D2: { PVC: { 2: [22, 28, 38, 48, 64, 83, 110, 132, 156, 192, 230, 261, 293, 331, 382, 427], 3: [19, 24, 33, 41, 54, 70, 92, 110, 130, 162, 193, 220, 246, 278, 320, 359] },
          XLPE: { 2: [23, 30, 39, 49, 65, 84, 107, 129, 153, 188, 226, 257, 287, 324, 375, 419], 3: [23, 30, 39, 49, 65, 84, 107, 129, 153, 188, 226, 257, 287, 324, 375, 419] } }
  };
  const METHODS = {
    B1: 'B1 — موصلات مفردة في ماسورة على/داخل الجدار',
    B2: 'B2 — كابل متعدد الأقطاب في ماسورة أو مجرى',
    C:  'C — كابل مثبت مباشرة على الجدار',
    E:  'E — كابل متعدد الأقطاب على حامل كابلات مثقّب',
    D:  'D1 — كابل في مواسير مدفونة في الأرض',
    D2: 'D2 — كابل مدفون مباشرة في الأرض'
  };
  // Ambient correction: air ref 30°C (B.52.14), ground ref 20°C (B.52.15). [PVC, XLPE]
  const T_AIR = { 10: [1.22, 1.15], 15: [1.17, 1.12], 20: [1.12, 1.08], 25: [1.06, 1.04], 30: [1, 1], 35: [0.94, 0.96], 40: [0.87, 0.91], 45: [0.79, 0.87], 50: [0.71, 0.82], 55: [0.61, 0.76], 60: [0.50, 0.71] };
  const T_GND = { 10: [1.10, 1.07], 15: [1.05, 1.04], 20: [1, 1], 25: [0.95, 0.96], 30: [0.89, 0.93], 35: [0.84, 0.89], 40: [0.77, 0.85], 45: [0.71, 0.80], 50: [0.63, 0.76], 55: [0.55, 0.71], 60: [0.45, 0.65] };
  // Grouping factors (B.52.17 / B.52.19)
  const G_BUNCH = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.65, 5: 0.6, 6: 0.57, 7: 0.54, 8: 0.52, 9: 0.5, 12: 0.45, 16: 0.41, 20: 0.38 };
  const G_WALL = { 1: 1, 2: 0.85, 3: 0.79, 4: 0.75, 5: 0.73, 6: 0.72, 7: 0.72, 8: 0.71, 9: 0.7 };
  const G_TRAY = { 1: 1, 2: 0.88, 3: 0.82, 4: 0.77, 5: 0.75, 6: 0.73, 7: 0.73, 8: 0.72, 9: 0.72 };
  const G_DUCT = { 1: 1, 2: 0.85, 3: 0.75, 4: 0.7, 5: 0.65, 6: 0.6, 7: 0.57, 8: 0.54, 9: 0.52, 10: 0.49, 11: 0.47, 12: 0.45, 13: 0.44, 14: 0.42, 15: 0.41, 16: 0.39, 17: 0.38, 18: 0.37, 19: 0.35, 20: 0.34 }; // B.52.19 ducts touching
  const G_DIRECT = { 1: 1, 2: 0.75, 3: 0.65, 4: 0.6, 5: 0.55, 6: 0.5, 7: 0.45, 8: 0.43, 9: 0.41, 12: 0.36, 16: 0.32, 20: 0.29 }; // B.52.18 cables touching
  const SOIL = { 0.5: 1.28, 0.7: 1.2, 1: 1.18, 1.5: 1.1, 2: 1.05, 2.5: 1, 3: 0.96 }; // B.52.16 buried ducts
  const SOIL_DIRECT = { 0.5: 1.88, 0.7: 1.62, 1: 1.5, 1.5: 1.28, 2: 1.12, 2.5: 1, 3: 0.9 }; // B.52.16 direct buried

  const BRK = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000];
  const BUS = [63, 100, 125, 160, 200, 250, 400, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000];

  const CATS = {
    LT: { ar: 'إنارة', cont: true, curve: 'C', rcd: false, minIn: 10, vd: 'light' },
    SK: { ar: 'مقابس عامة', cont: false, curve: 'C', rcd: true, minIn: 20, vd: 'other' },
    DS: { ar: 'مقابس مخصصة وأجهزة', cont: false, curve: 'C', rcd: true, minIn: 16, vd: 'other' },
    KT: { ar: 'مطابخ', cont: false, curve: 'C', rcd: true, minIn: 16, vd: 'other' },
    WH: { ar: 'سخانات مياه', cont: true, curve: 'C', rcd: true, minIn: 16, vd: 'other' },
    AC: { ar: 'تكييف وتهوية', cont: true, curve: 'C', rcd: false, minIn: 16, motor: true, vd: 'other' },
    MT: { ar: 'مضخات ومحركات', cont: true, curve: 'D', rcd: false, minIn: 10, motor: true, vd: 'other' },
    LF: { ar: 'مصاعد', cont: false, curve: 'D', rcd: false, minIn: 16, motor: true, vd: 'other' },
    IT: { ar: 'تقنية معلومات وUPS', cont: true, curve: 'C', rcd: false, minIn: 16, vd: 'other' },
    EV: { ar: 'شواحن سيارات', cont: true, curve: 'C', rcd: true, minIn: 16, k125: true, vd: 'other' },
    SL: { ar: 'ملاعب وإنارة رياضية', cont: true, curve: 'C', rcd: false, minIn: 10, vd: 'light' },
    IN: { ar: 'بنية تحتية', cont: true, curve: 'C', rcd: false, minIn: 10, vd: 'light' },
    FS: { ar: 'سلامة وحريق', cont: false, curve: 'D', rcd: false, minIn: 10, motor: true, vd: 'other' },
    SP: { ar: 'احتياطي', cont: false, curve: 'C', rcd: false, minIn: 20, vd: 'other' }
  };

  const PROJECTS = {
    off:    { ar: 'مكاتب ومبانٍ إدارية', df: { LT: 1, SK: 0.5, DS: 0.7, KT: 0.7, WH: 1, AC: 1, MT: 1, IT: 1, EV: 1, SL: 1, IN: 1, FS: 1 }, rec: ['LT', 'SK', 'DS', 'AC', 'IT', 'WH', 'MT', 'LF', 'FS'] },
    res:    { ar: 'سكني (فلل وشقق)', df: { LT: 0.9, SK: 0.5, DS: 0.6, KT: 0.6, WH: 0.5, AC: 1, MT: 1, IT: 1, EV: 1, SL: 1, IN: 1, FS: 1 }, rec: ['LT', 'SK', 'DS', 'KT', 'WH', 'AC', 'MT', 'LF', 'EV'] },
    retail: { ar: 'تجاري ومراكز تسوق', df: { LT: 1, SK: 0.5, DS: 0.7, KT: 0.7, WH: 0.8, AC: 1, MT: 1, IT: 1, EV: 1, SL: 1, IN: 1, FS: 1 }, rec: ['LT', 'SK', 'DS', 'KT', 'AC', 'MT', 'LF', 'EV', 'FS'] },
    mosque: { ar: 'مساجد', df: { LT: 1, SK: 0.3, DS: 0.6, KT: 0.6, WH: 0.7, AC: 1, MT: 1, IT: 1, EV: 1, SL: 1, IN: 1, FS: 1 }, rec: ['LT', 'SK', 'AC', 'WH', 'DS', 'MT', 'IT'] },
    school: { ar: 'مدارس ومعاهد', df: { LT: 1, SK: 0.4, DS: 0.6, KT: 0.7, WH: 0.7, AC: 1, MT: 1, IT: 1, EV: 1, SL: 1, IN: 1, FS: 1 }, rec: ['LT', 'SK', 'AC', 'DS', 'IT', 'KT', 'WH', 'MT'] },
    hosp:   { ar: 'مستشفيات وعيادات', df: { LT: 1, SK: 0.6, DS: 0.8, KT: 0.7, WH: 0.8, AC: 1, MT: 1, IT: 1, EV: 1, SL: 1, IN: 1, FS: 1 }, rec: ['LT', 'SK', 'DS', 'AC', 'IT', 'MT', 'LF', 'WH', 'FS'] },
    hotel:  { ar: 'فنادق وشقق مفروشة', df: { LT: 0.8, SK: 0.5, DS: 0.6, KT: 0.7, WH: 0.6, AC: 0.9, MT: 1, IT: 1, EV: 1, SL: 1, IN: 1, FS: 1 }, rec: ['LT', 'SK', 'DS', 'WH', 'AC', 'KT', 'LF', 'MT'] },
    sport:  { ar: 'ملاعب ومنشآت رياضية', df: { LT: 1, SK: 0.5, DS: 0.7, KT: 0.8, WH: 0.7, AC: 1, MT: 1, IT: 1, EV: 1, SL: 1, IN: 1, FS: 1 }, rec: ['SL', 'LT', 'AC', 'SK', 'DS', 'KT', 'MT', 'IT'] },
    infra:  { ar: 'بنية تحتية (طرق ومحطات)', df: { LT: 1, SK: 0.5, DS: 0.7, KT: 0.7, WH: 0.7, AC: 1, MT: 1, IT: 1, EV: 1, SL: 1, IN: 1, FS: 1 }, rec: ['IN', 'MT', 'LT', 'EV', 'IT', 'AC'] }
  };
  const LIFT_DF = [1, 0.75, 0.6];

  // ---- Load library: unit W | VA | kW (shaft) | kWe (electric input) | TR (with EER) | kVA
  const L = (id, cat, ar, unit, val, o = {}) => Object.assign({ id, cat, ar, unit, val, pf: 0.9, ph: 1 }, o);
  const LIB = [
    L('lt-panel36', 'LT', 'لوحة LED 60×60', 'W', 36, { pf: 0.95 }),
    L('lt-panel40', 'LT', 'لوحة LED 60×60', 'W', 40, { pf: 0.95 }),
    L('lt-down12', 'LT', 'داونلايت LED', 'W', 12, { pf: 0.95 }),
    L('lt-down18', 'LT', 'داونلايت LED', 'W', 18, { pf: 0.95 }),
    L('lt-linear', 'LT', 'إنارة خطية LED (1.2 م)', 'W', 40, { pf: 0.95 }),
    L('lt-strip', 'LT', 'شريط LED (لكل متر)', 'W', 14.4, { pf: 0.9 }),
    L('lt-hibay150', 'LT', 'هاي باي LED للمستودعات', 'W', 150, { pf: 0.95 }),
    L('lt-hibay200', 'LT', 'هاي باي LED للمستودعات', 'W', 200, { pf: 0.95 }),
    L('lt-wall', 'LT', 'إنارة جدارية خارجية', 'W', 20, { pf: 0.9 }),
    L('lt-emerg', 'LT', 'إنارة طوارئ / مخرج', 'W', 5, { pf: 0.9 }),
    L('lt-chand', 'LT', 'ثريا ديكورية', 'W', 120, { pf: 0.95 }),
    L('lt-bollard', 'LT', 'إنارة حدائق Bollard', 'W', 15, { pf: 0.9 }),

    L('sk-180', 'SK', 'مقبس عام 13A', 'VA', 180),
    L('sk-200', 'SK', 'مقبس عام 13A', 'VA', 200),
    L('sk-floor', 'SK', 'مقبس أرضي / Floor box', 'VA', 180),
    L('sk-out', 'SK', 'مقبس خارجي مقاوم IP66', 'VA', 200),

    L('ds-wash', 'DS', 'غسالة ملابس', 'VA', 2200),
    L('ds-dryer', 'DS', 'مجفف ملابس', 'VA', 3000, { pf: 1 }),
    L('ds-dish', 'DS', 'غسالة صحون', 'VA', 2000),
    L('ds-fridge', 'DS', 'ثلاجة منزلية', 'VA', 300, { pf: 0.8 }),
    L('ds-micro', 'DS', 'مايكرويف', 'VA', 1500),
    L('ds-kettle', 'DS', 'غلاية / مكينة قهوة', 'VA', 2000, { pf: 1 }),
    L('ds-copier', 'DS', 'طابعة / ناسخة', 'VA', 1500),
    L('ds-dryerhand', 'DS', 'مجفف أيدي', 'VA', 1800, { pf: 1 }),
    L('ds-tv', 'DS', 'تلفزيون وأجهزة صوت', 'VA', 300),
    L('ds-iron', 'DS', 'مكواة / أجهزة تجميل', 'VA', 1500, { pf: 1 }),

    L('kt-cooker', 'KT', 'موقد وفرن كهربائي منزلي', 'W', 6000, { pf: 1 }),
    L('kt-oven3', 'KT', 'فرن تجاري ثلاثي الطور', 'W', 9000, { pf: 1, ph: 3 }),
    L('kt-fryer', 'KT', 'قلاية تجارية ثلاثية الطور', 'W', 12000, { pf: 1, ph: 3 }),
    L('kt-griddle', 'KT', 'شواية / صاج تجاري', 'W', 6000, { pf: 1, ph: 3 }),
    L('kt-chiller', 'KT', 'ثلاجة عرض تجارية', 'VA', 1000, { pf: 0.8 }),
    L('kt-hood', 'KT', 'شفاط مطبخ تجاري', 'kW', 1.1, { pf: 0.82, eff: 0.8, ph: 3 }),

    L('wh-50', 'WH', 'سخان مياه 50 لتر', 'W', 1500, { pf: 1 }),
    L('wh-100', 'WH', 'سخان مياه 100 لتر', 'W', 3000, { pf: 1 }),
    L('wh-inst', 'WH', 'سخان فوري', 'W', 6000, { pf: 1 }),
    L('wh-central', 'WH', 'سخان مركزي ثلاثي الطور', 'W', 12000, { pf: 1, ph: 3 }),

    L('ac-s1', 'AC', 'سبليت 1 طن', 'TR', 1, { eer: 11.5 }),
    L('ac-s15', 'AC', 'سبليت 1.5 طن', 'TR', 1.5, { eer: 11.5 }),
    L('ac-s2', 'AC', 'سبليت 2 طن', 'TR', 2, { eer: 11.5 }),
    L('ac-s25', 'AC', 'سبليت 2.5 طن', 'TR', 2.5, { eer: 11 }),
    L('ac-w15', 'AC', 'مكيف شباك 1.5 طن', 'TR', 1.5, { eer: 9.5 }),
    L('ac-w2', 'AC', 'مكيف شباك 2 طن', 'TR', 2, { eer: 9.5 }),
    L('ac-d3', 'AC', 'مخفي (Ducted) 3 طن ثلاثي', 'TR', 3, { eer: 10.5, ph: 3 }),
    L('ac-d4', 'AC', 'مخفي (Ducted) 4 طن ثلاثي', 'TR', 4, { eer: 10.5, ph: 3 }),
    L('ac-d5', 'AC', 'مخفي (Ducted) 5 طن ثلاثي', 'TR', 5, { eer: 10.5, ph: 3 }),
    L('ac-p10', 'AC', 'وحدة باكدج 10 طن', 'TR', 10, { eer: 9.8, ph: 3 }),
    L('ac-p20', 'AC', 'وحدة باكدج 20 طن', 'TR', 20, { eer: 9.8, ph: 3 }),
    L('ac-vrf', 'AC', 'وحدة VRF خارجية (أدخل kW اللوحة)', 'kWe', 12, { pf: 0.95, ph: 3 }),
    L('ac-fcu', 'AC', 'وحدة FCU', 'W', 150, { pf: 0.85, minIn: 10 }),
    L('ac-ahu', 'AC', 'مروحة AHU', 'kW', 5.5, { pf: 0.85, eff: 0.89, ph: 3 }),
    L('ac-ex60', 'AC', 'مروحة شفط صغيرة', 'W', 60, { pf: 0.8, minIn: 10 }),
    L('ac-ex', 'AC', 'مروحة شفط / تهوية', 'kW', 0.75, { pf: 0.8, eff: 0.78, ph: 3, minIn: 10 }),

    L('mt-home', 'MT', 'مضخة مياه منزلية', 'kW', 0.75, { pf: 0.85, eff: 0.75 }),
    L('mt-b22', 'MT', 'مضخة تعزيز 2.2 kW', 'kW', 2.2, { pf: 0.82, eff: 0.85, ph: 3 }),
    L('mt-b4', 'MT', 'مضخة تعزيز 4 kW', 'kW', 4, { pf: 0.85, eff: 0.88, ph: 3 }),
    L('mt-75', 'MT', 'مضخة / محرك 7.5 kW', 'kW', 7.5, { pf: 0.85, eff: 0.9, ph: 3 }),
    L('mt-15', 'MT', 'مضخة / محرك 15 kW', 'kW', 15, { pf: 0.86, eff: 0.91, ph: 3 }),
    L('mt-30', 'MT', 'مضخة / محرك 30 kW', 'kW', 30, { pf: 0.86, eff: 0.92, ph: 3 }),
    L('mt-75k', 'MT', 'مضخة / محرك 75 kW', 'kW', 75, { pf: 0.87, eff: 0.94, ph: 3 }),
    L('mt-sump', 'MT', 'مضخة تصريف (Sump)', 'kW', 1.5, { pf: 0.82, eff: 0.8, ph: 3 }),
    L('mt-pool', 'MT', 'مضخة مسبح وفلتر', 'kW', 1.5, { pf: 0.82, eff: 0.8 }),
    L('mt-gate', 'MT', 'محرك بوابة / باب جراج', 'VA', 600, { pf: 0.8 }),

    L('lf-home', 'LF', 'مصعد منزلي', 'kW', 4, { pf: 0.85, eff: 0.88, ph: 3 }),
    L('lf-8', 'LF', 'مصعد ركاب 8 أشخاص', 'kW', 7.5, { pf: 0.85, eff: 0.9, ph: 3 }),
    L('lf-13', 'LF', 'مصعد ركاب 13 شخصاً', 'kW', 11, { pf: 0.85, eff: 0.9, ph: 3 }),
    L('lf-svc', 'LF', 'مصعد خدمة / بضائع', 'kW', 15, { pf: 0.86, eff: 0.91, ph: 3 }),
    L('lf-esc', 'LF', 'سلم كهربائي', 'kW', 11, { pf: 0.85, eff: 0.9, ph: 3 }),

    L('it-ups1', 'IT', 'UPS 1 kVA', 'kVA', 1.2),
    L('it-ups3', 'IT', 'UPS 3 kVA / خزانة شبكة', 'kVA', 3),
    L('it-ups10', 'IT', 'UPS 10 kVA ثلاثي', 'kVA', 11, { ph: 3 }),
    L('it-rack', 'IT', 'خزانة خوادم', 'kVA', 5),
    L('it-cctv', 'IT', 'مسجل CCTV وكاميرات', 'VA', 400),
    L('it-acs', 'IT', 'التحكم بالدخول والبوابات', 'VA', 300),
    L('it-bms', 'IT', 'لوحة BMS / تحكم', 'VA', 300),

    L('ev-7', 'EV', 'شاحن AC أحادي 7.4 kW', 'kWe', 7.4, { pf: 0.99 }),
    L('ev-11', 'EV', 'شاحن AC ثلاثي 11 kW', 'kWe', 11, { pf: 0.99, ph: 3 }),
    L('ev-22', 'EV', 'شاحن AC ثلاثي 22 kW', 'kWe', 22, { pf: 0.99, ph: 3 }),
    L('ev-50', 'EV', 'شاحن DC سريع 50 kW', 'kWe', 50, { pf: 0.98, ph: 3 }),

    L('sl-fl1000', 'SL', 'كشاف ملعب LED 1000W', 'W', 1000, { pf: 0.95 }),
    L('sl-fl1500', 'SL', 'كشاف ملعب LED 1500W', 'W', 1500, { pf: 0.95 }),
    L('sl-pole', 'SL', 'عمود كشافات (6 × 1000W) ثلاثي', 'W', 6000, { pf: 0.95, ph: 3 }),
    L('sl-padel', 'SL', 'إنارة ملعب بادل كامل (Class I)', 'W', 2000, { pf: 0.95 }),
    L('sl-screen', 'SL', 'شاشة LED (لكل م²)', 'VA', 300),
    L('sl-score', 'SL', 'لوحة نتائج', 'VA', 2000),
    L('sl-pa', 'SL', 'نظام صوتيات PA', 'VA', 2000),
    L('sl-irr', 'SL', 'مضخة ري العشب', 'kW', 7.5, { pf: 0.85, eff: 0.9, ph: 3 }),

    L('in-st100', 'IN', 'إنارة شارع LED 100W', 'W', 100, { pf: 0.95 }),
    L('in-st150', 'IN', 'إنارة شارع LED 150W', 'W', 150, { pf: 0.95 }),
    L('in-st250', 'IN', 'إنارة شارع LED 250W', 'W', 250, { pf: 0.95 }),
    L('in-tunnel', 'IN', 'إنارة نفق LED', 'W', 120, { pf: 0.95 }),
    L('in-signal', 'IN', 'إشارة مرور (تقاطع)', 'VA', 500),
    L('in-cam', 'IN', 'كاميرا طريق / ITS', 'VA', 60),
    L('in-vms', 'IN', 'لوحة رسائل متغيرة VMS', 'VA', 3000),
    L('in-fount', 'IN', 'مضخة نافورة', 'kW', 2.2, { pf: 0.82, eff: 0.85, ph: 3 }),

    L('fs-fap', 'FS', 'لوحة إنذار حريق', 'VA', 300, { pf: 0.9, curve: 'C' }),
    L('fs-pres', 'FS', 'مروحة ضغط سلالم 5.5 kW', 'kW', 5.5, { pf: 0.85, eff: 0.89, ph: 3, mode: 'fire' }),
    L('fs-smoke', 'FS', 'مروحة شفط دخان 11 kW', 'kW', 11, { pf: 0.85, eff: 0.9, ph: 3, mode: 'fire' }),
    L('fs-jockey', 'FS', 'مضخة جوكي', 'kW', 2.2, { pf: 0.82, eff: 0.85, ph: 3 }),
    L('fs-pump', 'FS', 'مضخة حريق كهربائية', 'kW', 45, { pf: 0.87, eff: 0.93, ph: 3, mode: 'fire' }),
    L('fs-lift', 'FS', 'مصعد إطفاء', 'kW', 15, { pf: 0.86, eff: 0.91, ph: 3 }),

    L('sp-1', 'SP', 'احتياطي أحادي', 'VA', 0, { brk: 20 }),
    L('sp-3', 'SP', 'احتياطي ثلاثي', 'VA', 0, { brk: 20, ph: 3 })
  ];

  // ---------- helpers
  const interp = (tbl, x) => {
    const ks = Object.keys(tbl).map(Number).sort((a, b) => a - b);
    if (x <= ks[0]) return tbl[ks[0]];
    if (x >= ks[ks.length - 1]) return tbl[ks[ks.length - 1]];
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (x >= a && x <= b) {
        const ta = tbl[a], tb = tbl[b];
        if (Array.isArray(ta)) return ta.map((v, j) => v + (tb[j] - v) * (x - a) / (b - a));
        return ta + (tb - ta) * (x - a) / (b - a);
      }
    }
  };
  const stepDown = (tbl, n) => { // grouping: use the value at n or the next tabulated count above (conservative)
    const ks = Object.keys(tbl).map(Number).sort((a, b) => a - b);
    for (const k of ks) if (n <= k) return tbl[k];
    return tbl[ks[ks.length - 1]];
  };
  const nextStd = (list, x) => { for (const v of list) if (v >= x - 1e-9) return v; return null; };
  const r2 = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

  function corrections(c) { // c: {method, ins, amb, group, soil}
    const ii = c.ins === 'XLPE' ? 1 : 0;
    const ground = c.method === 'D' || c.method === 'D2';
    const ca = (ground ? interp(T_GND, c.amb) : interp(T_AIR, c.amb))[ii];
    const gt = c.method === 'E' ? G_TRAY : c.method === 'C' ? G_WALL : c.method === 'D' ? G_DUCT : c.method === 'D2' ? G_DIRECT : G_BUNCH;
    const cg = stepDown(gt, Math.max(1, Math.round(c.group || 1)));
    const cs = c.method === 'D' ? interp(SOIL, c.soil || 2.5) : c.method === 'D2' ? interp(SOIL_DIRECT, c.soil || 2.5) : 1;
    return { ca, cg, cs, k: ca * cg * cs };
  }
  function earthSize(s) {
    if (s <= 16) return s;
    if (s <= 35) return 16;
    return nextStd(SIZES, s / 2);
  }
  function rOhmKm(idx) { return R20[idx] * 1.25; } // IEC 60364-5-52 Annex G: ρ1 = 1.25 × ρ20
  function vdPct(I, Lm, idx, ins, pf, ph, sys, nPar = 1) {
    if (!Lm || I <= 0) return 0;
    const R = rOhmKm(idx, ins) / nPar, X = X_KM / nPar;
    const cos = Math.min(1, Math.max(0.1, pf || 0.9)), sin = Math.sqrt(1 - cos * cos);
    const z = R * cos + X * sin;
    if (ph === 3) return Math.sqrt(3) * I * (Lm / 1000) * z / sys.VLL * 100;
    return 2 * I * (Lm / 1000) * z / sys.VLN * 100;
  }

  function unitVA(r) {
    const pf = r.pf || 1;
    switch (r.unit) {
      case 'W': return r.val / pf;
      case 'VA': return r.val;
      case 'kVA': return r.val * 1000;
      case 'kW': return r.val * 1000 / ((r.eff || 0.9) * pf);
      case 'kWe': return r.val * 1000 / pf;
      case 'TR': return r.val * 12000 / (r.eer || 11) / pf;
      default: return r.val;
    }
  }

  // Select cable for a circuit: smallest size with Iz >= In and VD within limit
  function pickCable(o) { // {In, Ib, len, pf, ph, inst, minSize, vdLimit, vdUp, sys, override, maxPar}
    const loaded = o.ph === 3 ? 3 : 2;
    const tbl = AMP[o.inst.method][o.inst.ins][loaded];
    const cf = corrections(o.inst);
    const startIdx = Math.max(0, SIZES.indexOf(o.minSize));
    const maxPar = o.maxPar || 1;
    const evalIdx = (i, n) => {
      const It = tbl[i];
      if (It == null) return null;
      const Iz = It * cf.k * n;
      const vd = vdPct(o.Ib, o.len, i, o.inst.ins, o.pf, o.ph, o.sys, n);
      return { idx: i, size: SIZES[i], n, It, Iz, vd, vdTot: vd + (o.vdUp || 0), okI: Iz >= o.In - 1e-9, okV: vd + (o.vdUp || 0) <= o.vdLimit + 1e-9 };
    };
    if (o.override && o.override !== 'auto') {
      const i = SIZES.indexOf(Number(o.override));
      const r = evalIdx(i, 1);
      if (!r) return { fail: 'method', cf };
      return Object.assign(r, { cf, manual: true });
    }
    for (let n = 1; n <= maxPar; n++) {
      for (let i = startIdx; i < SIZES.length; i++) {
        const r = evalIdx(i, n);
        if (!r) break;
        if (r.okI && r.okV) return Object.assign(r, { cf });
      }
    }
    return { fail: 'none', cf };
  }

  function deviceLabel(In, rcd) {
    if (In <= 63) return rcd ? 'RCBO' : 'MCB';
    if (In <= 1600) return rcd ? 'MCCB+RCD' : 'MCCB';
    return 'ACB';
  }

  // ---------- full calculation
  function compute(state) {
    const s = state.settings;
    const sys = s.system === '1P' ? { VLN: 230, VLL: 400, threeP: false } : s.system === '380' ? { VLN: 220, VLL: 380, threeP: true } : { VLN: 230, VLL: 400, threeP: true };
    const proj = PROJECTS[s.project] || PROJECTS.off;
    const dfOf = cat => (state.dfOverride && state.dfOverride[cat] != null) ? state.dfOverride[cat] : (proj.df[cat] ?? 1);
    const out = { rows: [], warnings: [], sys };

    // 1) row loads
    for (const r of state.rows) {
      const cat = CATS[r.cat] || CATS.DS;
      const ph = sys.threeP ? (r.ph === 3 ? 3 : 1) : 1;
      const uva = r.cat === 'SP' ? 0 : unitVA(r);
      const VA = uva * (r.qty || 0);
      const P = VA * (r.unit === 'W' || r.unit === 'kW' || r.unit === 'kWe' || r.unit === 'TR' ? (r.pf || 1) : (r.pf || 1));
      const Ib = VA / (ph === 3 ? Math.sqrt(3) * sys.VLL : sys.VLN);
      const phase = ph === 3 ? '3P' : (sys.threeP ? (r.phase || 'L1') : 'L1');
      const per = { L1: 0, L2: 0, L3: 0 };
      if (ph === 3) { per.L1 = per.L2 = per.L3 = VA / 3; } else per[phase] = VA;
      const mode = r.mode || 'duty';
      const dfCat = r.cat === 'SP' ? 0 : (r.df != null && r.df !== '' ? Number(r.df) : dfOf(r.cat));
      out.rows.push({ id: r.id, r, cat, ph, uva, VA, P, Ib, phase, per, mode, dfCat, df: mode === 'duty' ? dfCat : 0 });
    }
    // lifts diversity (largest 1, second 0.75, rest 0.6) — applies to duty lift units
    const liftUnits = [];
    out.rows.forEach(x => { if (x.r.cat === 'LF' && x.mode === 'duty') for (let i = 0; i < (x.r.qty || 0); i++) liftUnits.push({ x, va: x.uva }); });
    liftUnits.sort((a, b) => b.va - a.va);
    const liftDem = new Map();
    liftUnits.forEach((u, i) => liftDem.set(u.x, (liftDem.get(u.x) || 0) + u.va * LIFT_DF[Math.min(i, 2)]));
    for (const x of out.rows) {
      if (x.r.cat === 'LF' && x.mode === 'duty' && !(x.r.df != null && x.r.df !== '')) {
        x.dem = liftDem.get(x) || 0; x.df = x.VA ? x.dem / x.VA : 0; x.liftRule = true;
      } else x.dem = x.VA * x.df;
      x.demPer = { L1: x.per.L1 * (x.VA ? x.dem / x.VA : 0), L2: x.per.L2 * (x.VA ? x.dem / x.VA : 0), L3: x.per.L3 * (x.VA ? x.dem / x.VA : 0) };
    }

    // 2) panel totals
    const conn = { L1: 0, L2: 0, L3: 0 }, dem = { L1: 0, L2: 0, L3: 0 };
    let fireVA = 0, standbyVA = 0;
    for (const x of out.rows) {
      for (const p of ['L1', 'L2', 'L3']) { conn[p] += x.per[p]; dem[p] += x.demPer[p]; }
      if (x.mode === 'fire') fireVA += x.VA;
      if (x.mode === 'standby') standbyVA += x.VA;
    }
    const totConn = conn.L1 + conn.L2 + conn.L3, totDem = dem.L1 + dem.L2 + dem.L3;
    const imb = o => { const a = (o.L1 + o.L2 + o.L3) / 3; return a > 0 ? (Math.max(o.L1, o.L2, o.L3) - a) / a * 100 : 0; };
    const IbPanel = sys.threeP ? Math.max(dem.L1, dem.L2, dem.L3) / sys.VLN : totDem / sys.VLN;
    const Iph = { L1: dem.L1 / sys.VLN, L2: dem.L2 / sys.VLN, L3: dem.L3 / sys.VLN };
    const IN = sys.threeP ? Math.sqrt(Math.max(0, Iph.L1 ** 2 + Iph.L2 ** 2 + Iph.L3 ** 2 - Iph.L1 * Iph.L2 - Iph.L2 * Iph.L3 - Iph.L3 * Iph.L1)) : IbPanel;
    const design = IbPanel * (1 + (s.spare || 0) / 100);
    const mainIn = s.mainOverride && s.mainOverride !== 'auto' ? Number(s.mainOverride) : nextStd(BRK, Math.max(design, 16));
    const bus = nextStd(BUS, mainIn);
    const pfAvg = totConn > 0 ? out.rows.reduce((a, x) => a + x.VA * (x.r.pf || 1), 0) / totConn : 0.9;
    const feeder = pickCable({ In: mainIn, Ib: IbPanel, len: s.feeder.len, pf: pfAvg || 0.9, ph: sys.threeP ? 3 : 1, inst: s.feeder, minSize: 2.5, vdLimit: s.feederVd, vdUp: 0, sys, override: s.feeder.override, maxPar: 4 });
    const vdUp = feeder.fail ? 0 : feeder.vd;
    out.panel = { conn, dem, totConn, totDem, imbConn: imb(conn), imbDem: sys.threeP ? imb(dem) : 0, IbPanel, Iph, IN, design, mainIn, bus, feeder, vdUp, fireVA, standbyVA, pfAvg,
      dfAll: totConn ? totDem / totConn : 0, mainDev: deviceLabel(mainIn, false) };

    // 3) circuit protection & cables
    for (const x of out.rows) {
      const r = x.r, cat = x.cat;
      if (r.cat === 'SP') {
        x.In = Number(r.brk && r.brk !== 'auto' ? r.brk : 20); x.brkAuto = 20; x.curve = r.curve || 'C';
        x.dev = deviceLabel(x.In, false); x.poles = x.ph === 3 ? 3 : 1; x.cable = null; continue;
      }
      const k = (cat.motor || cat.k125) ? 1.25 : (s.nec125 && cat.cont ? 1.25 : 1);
      const minIn = r.minIn || cat.minIn;
      x.brkAuto = nextStd(BRK, Math.max(x.Ib * k, minIn));
      x.In = r.brk && r.brk !== 'auto' ? Number(r.brk) : x.brkAuto;
      x.k = k;
      x.curve = r.curve || cat.curve;
      x.rcd = r.rcd != null ? r.rcd : cat.rcd;
      x.dev = deviceLabel(x.In, x.rcd);
      x.poles = x.ph === 3 ? 3 : 1;
      const lenEff = (s.distributed && (r.cat === 'LT' || r.cat === 'SK')) ? (r.len || 0) / 2 : (r.len || 0);
      const vdLimit = cat.vd === 'light' ? s.vdLight : s.vdOther;
      x.vdLimit = vdLimit;
      x.cable = pickCable({ In: x.In, Ib: x.Ib, len: lenEff, pf: r.pf || 0.9, ph: x.ph, inst: s.final, minSize: Math.max(s.minSize, r.minSize || 0), vdLimit, vdUp, sys, override: r.cable, maxPar: 1 });
      if (!x.cable.fail) {
        x.cable.earth = earthSize(x.cable.size);
        const cores = x.ph === 3 ? (cat.motor ? 3 : 4) : 2;
        const single = s.final.method === 'B1';
        x.cable.label = (single ? cores + '×1C ' : cores + 'C×') + fmtSize(x.cable.size) + ' + ' + fmtSize(x.cable.earth) + 'E';
      }
    }

    // 4) circuit numbering
    numberCircuits(state, out, sys);

    // 5) categories
    const cats = {};
    for (const x of out.rows) {
      if (x.r.cat === 'SP') continue;
      const c = cats[x.r.cat] || (cats[x.r.cat] = { conn: 0, dem: 0, n: 0 });
      c.conn += x.VA; c.dem += x.dem; c.n++;
    }
    out.cats = cats;

    // 6) warnings
    const W = out.warnings, P = out.panel;
    const lim = s.imbLimit || 10;
    if (sys.threeP && P.imbDem > lim) W.push({ lvl: 'crit', t: `عدم اتزان الأطوار في الحمل المطلوب ${r2(P.imbDem, 1)}% يتجاوز الحد ${lim}%. اضغط «موازنة الأطوار تلقائياً» أو انقل دوائر.` });
    else if (sys.threeP && P.imbConn > lim) W.push({ lvl: 'warn', t: `عدم اتزان الأطوار في الحمل الموصول ${r2(P.imbConn, 1)}% يتجاوز ${lim}% رغم أن الحمل المطلوب متزن.` });
    if (feeder.fail) W.push({ lvl: 'crit', t: 'لا يوجد كابل تغذية مناسب بهذه الظروف حتى 4 كابلات متوازية. غيّر طريقة التمديد أو قلّل الطول أو راجع الحمل.' });
    else {
      if (feeder.n > 1) W.push({ lvl: 'info', t: `كابل التغذية يحتاج ${feeder.n} كابلات متوازية لكل طور.` });
      if (feeder.manual && !feeder.okI) W.push({ lvl: 'crit', t: `كابل التغذية المختار يدوياً (${fmtSize(feeder.size)} mm²) قدرته ${r2(feeder.Iz, 0)}A أقل من القاطع الرئيسي ${mainIn}A.` });
      if (!feeder.okV) W.push({ lvl: 'warn', t: `هبوط الجهد على المغذي ${r2(feeder.vd)}% يتجاوز الحد ${s.feederVd}%.` });
    }
    if (s.isc > 0 && s.icu > 0 && s.icu < s.isc) W.push({ lvl: 'crit', t: `سعة قطع القواطع ${s.icu} kA أقل من تيار القصر المتوقع عند اللوحة ${s.isc} kA.` });
    if (s.mainOverride && s.mainOverride !== 'auto' && mainIn < design) W.push({ lvl: 'crit', t: `القاطع الرئيسي ${mainIn}A أقل من تيار التصميم مع الاحتياطي ${r2(design, 1)}A.` });
    for (const x of out.rows) {
      if (x.r.cat === 'SP') continue;
      const tag = `الدائرة ${x.cct || '—'} (${x.r.desc || x.cat.ar})`;
      if (x.In < x.Ib - 1e-9) W.push({ lvl: 'crit', t: `${tag}: القاطع ${x.In}A أصغر من تيار الحمل ${r2(x.Ib, 1)}A.` });
      if (x.cable.fail) W.push({ lvl: 'crit', t: `${tag}: لا يوجد مقطع مناسب في جدول طريقة التمديد. غيّر الطريقة أو قسّم الدائرة.` });
      else {
        if (!x.cable.okI) W.push({ lvl: 'crit', t: `${tag}: الكابل ${fmtSize(x.cable.size)} mm² قدرته بعد التصحيح ${r2(x.cable.Iz, 1)}A أقل من القاطع ${x.In}A، فالقاطع لا يحميه.` });
        if (!x.cable.okV) W.push({ lvl: 'warn', t: `${tag}: هبوط الجهد الكلي ${r2(x.cable.vdTot)}% يتجاوز ${x.vdLimit}%.` });
      }
      if (['SK', 'DS', 'KT', 'WH', 'EV'].includes(x.r.cat) && !x.rcd) W.push({ lvl: 'warn', t: `${tag}: دائرة مقابس أو أجهزة بدون حماية تسرب RCD 30mA.` });
      if (x.r.cat === 'FS' && x.rcd) W.push({ lvl: 'warn', t: `${tag}: لا يوصى بـ RCD على دوائر السلامة والحريق لتفادي الفصل غير المرغوب.` });
      if (x.r.cat === 'EV' && x.rcd) W.push({ lvl: 'info', t: `${tag}: شاحن EV يحتاج RCD نوع A مع كشف تسرب DC 6mA أو نوع B حسب الشاحن.` });
    }
    if (out.overflow) W.push({ lvl: 'crit', t: `عدد الدوائر يتجاوز مخارج اللوحة (${out.waysTotal} مخرج أحادي). كبّر اللوحة.` });
    else if (out.waysTotal) {
      const free = out.waysTotal - out.waysUsed;
      if (free / out.waysTotal * 100 < (s.spareWays || 0) - 1e-9) W.push({ lvl: 'warn', t: `المخارج الفارغة ${free} من ${out.waysTotal} (${r2(free / out.waysTotal * 100, 0)}%) أقل من ${s.spareWays}% المطلوبة.` });
    }
    if (fireVA > 0) W.push({ lvl: 'info', t: `أحمال تعمل في وضع الحريق فقط ${r2(fireVA / 1000, 1)} kVA مستبعدة من الطلب العادي. أدخلها في حساب المولد.` });
    if (standbyVA > 0) W.push({ lvl: 'info', t: `معدات احتياطية ${r2(standbyVA / 1000, 1)} kVA مستبعدة من الطلب. تأكد من وجود تعشيق يمنع تشغيلها مع المعدات العاملة.` });
    return out;
  }

  function numberCircuits(state, out, sys) {
    const s = state.settings;
    if (!sys.threeP) {
      let n = 0; const total = s.ways || 12;
      for (const x of out.rows) { n++; x.cct = n <= total ? String(n) : '—'; }
      out.waysTotal = total; out.waysUsed = Math.min(n, total); out.overflow = n > total; return;
    }
    const W = s.ways || 12; // TPN ways
    const slots = Array.from({ length: W }, () => ({ L1: false, L2: false, L3: false }));
    let used = 0, overflow = false;
    for (const x of out.rows) {
      if (x.ph === 3) {
        const w = slots.findIndex(sl => !sl.L1 && !sl.L2 && !sl.L3);
        if (w < 0) { x.cct = '—'; overflow = true; continue; }
        slots[w].L1 = slots[w].L2 = slots[w].L3 = true; x.cct = (w + 1) + 'L123'; used += 3;
      } else {
        const p = x.phase;
        const w = slots.findIndex(sl => !sl[p]);
        if (w < 0) { x.cct = '—'; overflow = true; continue; }
        slots[w][p] = true; x.cct = (w + 1) + p; used += 1;
      }
    }
    out.waysTotal = W * 3; out.waysUsed = used; out.overflow = overflow;
  }

  // Greedy phase balancing on demand, spreading same-category circuits
  function balance(state) {
    const res = compute(state);
    const sys = res.sys;
    if (!sys.threeP) return state;
    const dem = { L1: 0, L2: 0, L3: 0 }, conn = { L1: 0, L2: 0, L3: 0 };
    const cnt = { L1: {}, L2: {}, L3: {} };
    const singles = [];
    for (const x of res.rows) {
      if (x.ph === 3) { for (const p of ['L1', 'L2', 'L3']) { dem[p] += x.demPer[p]; conn[p] += x.per[p]; } }
      else singles.push(x);
    }
    const spares = singles.filter(x => x.r.cat === 'SP');
    const loads = singles.filter(x => x.r.cat !== 'SP');
    loads.sort((a, b) => (b.dem - a.dem) || (b.VA - a.VA));
    const nOn = { L1: 0, L2: 0, L3: 0 };
    for (const x of loads) {
      const c = x.r.cat;
      const minC = Math.min(...['L1', 'L2', 'L3'].map(p => cnt[p][c] || 0));
      let best = null, bestScore = Infinity;
      for (const p of ['L1', 'L2', 'L3']) {
        const extra = ((cnt[p][c] || 0) - minC) * 0.35 * Math.max(x.dem, 50);
        const score = dem[p] + x.dem + extra + 0.02 * (conn[p] + x.VA);
        if (score < bestScore - 1e-9) { bestScore = score; best = p; }
      }
      const row = state.rows.find(r => r.id === x.id);
      row.phase = best;
      dem[best] += x.dem; conn[best] += x.VA; cnt[best][c] = (cnt[best][c] || 0) + 1; nOn[best]++;
    }
    for (const x of spares) { // spare ways go where fewest single-phase circuits sit
      const best = ['L1', 'L2', 'L3'].sort((a, b) => nOn[a] - nOn[b] || dem[a] - dem[b])[0];
      state.rows.find(r => r.id === x.id).phase = best; nOn[best]++;
    }
    return state;
  }

  function lightestPhase(state) {
    const res = compute(state);
    const d = res.panel.dem;
    return ['L1', 'L2', 'L3'].sort((a, b) => d[a] - d[b])[0];
  }

  const fmtSize = s => (s === 1.5 ? '1.5' : String(s));

  return { SIZES, AMP, METHODS, BRK, BUS, CATS, PROJECTS, LIB, compute, balance, lightestPhase, unitVA, corrections, earthSize, fmtSize, r2 };
})();
if (typeof module !== 'undefined') module.exports = ENG;
