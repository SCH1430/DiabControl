// Offline, manually advanced visual instructions. SVG animation never advances a medical step.
const emergencyGuideContent = {
  measure: {
    title: 'Как измерить сахар',
    subtitle: 'Глюкометр · от подготовки до результата',
    notice: 'Если человек без сознания — сначала 112 и проверка дыхания. Измерение не должно задерживать помощь.',
    steps: [
      ['Вымойте и высушите руки', 'Вымойте руки тёплой водой с мылом и полностью высушите. Подготовьте глюкометр, подходящую тест-полоску и прокалыватель с новым ланцетом.', 'Остатки еды или влаги на пальце могут исказить результат.', 'wash'],
      ['Вставьте тест-полоску', 'Возьмите новую полоску из закрытой упаковки. Вставьте её контактами в глюкометр, как указано на приборе. Дождитесь значка капли.', 'Проверьте срок годности полосок. Не трогайте место, которое впитывает кровь.', 'strip'],
      ['Получите маленькую каплю крови', 'Снимите защиту с нового ланцета и подготовьте прокалыватель по его инструкции. Приложите его сбоку к подушечке пальца и нажмите кнопку.', 'Не используйте чужой прокалыватель. Не сдавливайте палец с силой.', 'prick'],
      ['Поднесите край полоски к капле', 'Осторожно коснитесь капли впитывающим краем полоски. Держите до сигнала или начала отсчёта на глюкометре.', 'Не размазывайте кровь по полоске и не добавляйте ещё кровь, если прибор этого не допускает.', 'sample'],
      ['Прочитайте число и единицы', 'Дождитесь результата. Введите в поле ниже именно число с экрана и выберите те же единицы: ммоль/л или мг/дл.', 'На рисунке только пример. Для LO или HI используйте отдельные кнопки. При ошибке прибора следуйте его инструкции; если измерить не удаётся, откройте раздел ниже.', 'result'],
      ['Уберите использованные материалы', 'Прижмите место прокола чистой салфеткой. Выбросьте полоску; использованный ланцет поместите в непрокалываемый закрывающийся контейнер.', 'Не оставляйте ланцет открытым и не используйте его повторно.', 'dispose'],
    ],
  },
  insulin: {
    title: 'Как пользоваться инсулиновой ручкой',
    subtitle: 'Только личный инсулин и назначенный план',
    notice: 'Не вводите инсулин человеку без сознания. Помощник без подготовки не должен подбирать или вводить дозу: вызовите 112 при ухудшении.',
    steps: [
      ['Проверьте препарат и назначение', 'Сверьте имя владельца, название, концентрацию инсулина, срок годности и назначенную дозу. Вымойте и высушите руки. Следуйте инструкции именно этой ручки.', 'Для коррекции нужен назначенный врачом инсулин. Не заменяйте его другим и не смешивайте по этой схеме.', 'pencheck'],
      ['Установите новую иглу', 'Снимите колпачок ручки. Снимите бумажную плёнку с новой совместимой иглы и закрепите её прямо. Снимите наружный и внутренний защитные колпачки иглы.', 'Не делитесь ручкой с другим человеком, даже если игла новая.', 'needle'],
      ['Проверьте поступление инсулина', 'Выставьте пробную дозу по инструкции ручки. Направьте иглу вверх и выполните проверку до появления инсулина на кончике.', 'Если инсулин не появляется, следуйте инструкции устройства. Не пытайтесь вводить дозу неисправной ручкой.', 'prime'],
      ['Выставьте подтверждённую дозу', 'Поверните селектор до нужного числа единиц в окошке. Сверьте число с личным планом и расчётом. Пробная доза из предыдущего шага в лечебную дозу не входит.', 'Учитывайте уже введённый инсулин. При сомнениях в дозе остановитесь и свяжитесь с медработником.', 'dial'],
      ['Введите иглу под кожу', 'Выберите рекомендованное место — например, живот или наружную поверхность бедра. Используйте новое место без уплотнений. Вводите иглу способом, которому обучил медработник.', 'Нужны ли складка кожи и определённый угол, зависит от длины иглы и человека. Не вводите в мышцу.', 'skin'],
      ['Нажмите и выдержите время', 'Нажмите кнопку введения до конца: в окошке должно быть «0». Удерживайте кнопку и оставьте иглу под кожей на время, указанное в инструкции вашей ручки. Затем извлеките иглу.', 'Время удержания различается у разных ручек. Не вводите дополнительную дозу, если не уверены, сколько уже введено.', 'hold'],
      ['Снимите иглу и запишите введение', 'Снимите иглу безопасным способом из инструкции и уберите её в контейнер для острых предметов. Закройте ручку колпачком. Запишите дозу и время.', 'Не надевайте маленький внутренний колпачок обратно. Не храните ручку с присоединённой иглой.', 'pendispose'],
    ],
  },
  glucagon: {
    title: 'Как подготовить GlucaGen HypoKit',
    subtitle: 'Набор: флакон с порошком + шприц с растворителем',
    notice: 'При потере сознания сначала вызовите 112. Если дыхание нормальное, поверните человека на бок. Ничего не давайте в рот. При ненормальном дыхании следуйте указаниям диспетчера по реанимации.',
    steps: [
      ['Убедитесь, что это нужный набор', 'Эти картинки относятся только к GlucaGen HypoKit с порошком и растворителем. Проверьте название, срок годности и листок-вкладыш. Вызов 112 уже должен быть сделан.', 'У готовой ручки и назального глюкагона другой порядок. Доза для ребёнка может отличаться: сверяйте её с инструкцией конкретного набора.', 'kit'],
      ['Введите растворитель во флакон', 'Снимите колпачок с флакона и защиту иглы. Проколите резиновую пробку и введите весь растворитель из комплектного шприца во флакон с порошком.', 'Используйте только растворитель, который находится в этом наборе.', 'dissolve'],
      ['Осторожно растворите порошок', 'Не вынимая иглу, осторожно покачивайте флакон до полного растворения. Раствор должен быть прозрачным и бесцветным.', 'Не используйте раствор с частицами или нерастворившийся порошок.', 'swirl'],
      ['Наберите дозу по инструкции набора', 'Переверните флакон со шприцем. Держите кончик иглы в растворе и оттяните поршень. Удалите пузырьки воздуха по инструкции набора и проверьте, что в шприце осталась нужная доза для этого человека.', 'Для взрослого по инструкции GlucaGen HypoKit 1 мг: 1 мг (1 мл приготовленного раствора). Детскую дозу сверяйте с листком-вкладышем по массе и возрасту; не переносите взрослую дозу на ребёнка.', 'withdraw'],
      ['Введите и оставайтесь рядом', 'Введите подготовленную дозу под кожу или в мышцу по инструкции набора, например в наружную поверхность бедра. Отметьте время. Оставьте человека на боку и проверяйте дыхание до приезда помощи.', 'После пробуждения давайте углеводы только когда человек может безопасно глотать. Не отменяйте вызов скорой.', 'glucagoninject'],
    ],
  },
  recovery: {
    title: 'Как положить человека на бок',
    subtitle: 'Без сознания, но дышит нормально',
    notice: 'Сначала вызовите 112. Редкие судорожные вдохи — это не нормальное дыхание: следуйте указаниям диспетчера по реанимации.',
    steps: [
      ['Подготовьте руки и ногу', 'Встаньте на колени рядом. Ближнюю руку отведите в сторону ладонью вверх. Дальнюю руку положите тыльной стороной ладони к ближней щеке и удерживайте. Согните дальнюю ногу в колене.', 'Если подозреваете травму позвоночника, следуйте указаниям диспетчера 112; проходимость дыхательных путей важнее.', 'sideprepare'],
      ['Осторожно поверните на бок', 'Удерживая ладонь у щеки, потяните за согнутое дальнее колено к себе. Осторожно поверните человека на бок. Расположите верхнюю ногу так, чтобы тело не перекатывалось обратно.', 'Не оставляйте человека одного и ничего не кладите ему в рот.', 'sideturn'],
      ['Следите за дыханием', 'Слегка запрокиньте голову, чтобы дыхательные пути оставались открытыми. Направьте рот вниз, чтобы жидкость могла вытекать. Проверяйте, что дыхание остаётся нормальным, до приезда скорой.', 'Если дыхание пропало или стало ненормальным — немедленно сообщите 112 и начните реанимацию по указаниям диспетчера.', 'sidewatch'],
    ],
  },
};

// Reference geometry: GlucaGen manufacturer leaflet https://www.medicines.org.uk/emc/product/1289/pil
// Strip edge/contact distinction: https://www.accu-chek.com/products/strips/guide
// Recovery position: https://www.nhsinform.scot/tests-and-treatments/first-aid/how-to-put-someone-in-the-recovery-position/
// Geometry is deliberately shared between frames: contact points, needle hubs and
// syringe seals stay connected. Each demonstration runs once and remains at its end.
const emergencyGuideScenes = {
  wash: ['Чистые руки', 'Полностью высушите'],
  strip: ['Контакты — в прибор', 'Край для капли — снаружи'],
  prick: ['Прокалыватель сбоку', 'Небольшая капля'],
  sample: ['Край касается капли', 'Дождитесь сигнала'],
  result: ['Число на экране', 'Единицы измерения'],
  dispose: ['Прижмите салфеткой', 'Ланцет — в контейнер'],
  pencheck: ['Название и концентрация', 'Личное назначение'],
  needle: ['Игла и ручка по одной оси', 'Снимите оба колпачка'],
  prime: ['Игла направлена вверх', 'Инсулин на кончике'],
  dial: ['Поворачивайте селектор', 'Сверьте окно дозы'],
  skin: ['Рекомендованное место', 'Игла в подкожной ткани'],
  hold: ['Кнопка нажата до конца', 'Выдержите время ручки'],
  pendispose: ['Игла снята с ручки', 'Контейнер для игл'],
  kit: ['Флакон с порошком', 'Шприц с растворителем'],
  dissolve: ['Игла проходит пробку', 'Весь растворитель во флакон'],
  swirl: ['Игла остаётся во флаконе', 'Прозрачный раствор'],
  withdraw: ['Кончик иглы в жидкости', 'Оттяните поршень'],
  glucagoninject: ['Наружная часть бедра', 'Нажмите на поршень'],
  sideprepare: ['Ладонь поддерживает щёку', 'Дальнее колено согнуто'],
  sideturn: ['Поворачивайте к себе', 'Верхняя нога — опора'],
  sidewatch: ['Рот направлен вниз', 'Проверяйте дыхание'],
};
// Short visible actions keep all operational prerequisites on screen. The complete,
// unchanged wording remains available in Details and is used for local speech.
const emergencyGuideActions = {
  wash: 'Руки — вымыть с мылом и полностью высушить. Приготовьте прибор, подходящую полоску и прокалыватель с новым ланцетом.',
  strip: 'Новую полоску вставьте контактами в прибор. Дождитесь значка капли.',
  prick: 'Подготовьте новый ланцет по инструкции. Приложите прокалыватель сбоку к подушечке пальца и нажмите кнопку.',
  sample: 'Коснитесь капли впитывающим краем полоски. Удерживайте до сигнала или начала отсчёта.',
  result: 'Дождитесь результата. Перенесите число и те же единицы с экрана: ммоль/л или мг/дл.',
  dispose: 'Прижмите палец чистой салфеткой. Полоску выбросьте, ланцет уберите в непрокалываемый закрывающийся контейнер.',
  pencheck: 'Сверьте владельца, препарат, концентрацию, срок годности и дозу. Вымойте и высушите руки; следуйте инструкции этой ручки.',
  needle: 'Снимите колпачок ручки и плёнку новой совместимой иглы. Закрепите иглу прямо. Снимите оба защитных колпачка.',
  prime: 'Пробная доза — по инструкции ручки. Иглой вверх выполните проверку до появления инсулина на кончике.',
  dial: 'Выберите подтверждённую дозу и сверьте число с личным планом. Пробная доза не входит в лечебную.',
  skin: 'Выберите новое рекомендованное место без уплотнений. Введите иглу способом, которому обучил медработник.',
  hold: 'Нажмите до «0». Держите кнопку и иглу под кожей столько, сколько указано в инструкции ручки. Затем извлеките иглу.',
  pendispose: 'Безопасно снимите иглу по инструкции и уберите в контейнер для острых предметов. Закройте ручку. Запишите дозу и время.',
  kit: 'Нужен GlucaGen HypoKit: порошок и растворитель. Проверьте название, срок годности и вкладыш. 112 уже должен быть вызван.',
  dissolve: 'Снимите колпачок флакона и защиту иглы. Через резиновую пробку введите весь комплектный растворитель.',
  swirl: 'Не вынимая иглу, осторожно покачивайте флакон. Порошок должен полностью раствориться; раствор — прозрачный и бесцветный.',
  withdraw: 'Переверните флакон со шприцем. Кончик иглы — в растворе. Оттяните поршень; удалите воздух и проверьте дозу по инструкции.',
  glucagoninject: 'Введите дозу под кожу или в мышцу по инструкции набора. Отметьте время. Человек остаётся на боку; проверяйте дыхание до приезда помощи.',
  sideprepare: 'Встаньте на колени рядом. Ближняя рука — в сторону ладонью вверх. Дальнюю ладонь тыльной стороной удерживайте у ближней щеки. Согните дальнюю ногу.',
  sideturn: 'Удерживая ладонь у щеки, потяните дальнее согнутое колено к себе. Поверните человека на бок. Верхняя нога удерживает тело от перекатывания.',
  sidewatch: 'Слегка запрокиньте голову, рот направьте вниз. Следите, чтобы дыхание оставалось нормальным, до приезда скорой.',
};
// Times match the finite CSS demonstrations. Static drawings never claim playback.
const emergencyGuideMotion = {
  wash: [4.2, 'Подготовка', 'Мытьё рук', 'Итог'],
  strip: [4, 'Контакты к прибору', 'Вставьте полоску', 'Итог'],
  prick: [4.6, 'Сбоку к пальцу', 'Прокол', 'Капля'],
  sample: [3.8, 'Край к капле', 'Коснитесь капли', 'Итог'],
  dispose: [4, 'После измерения', 'Уберите ланцет', 'Итог'],
  needle: [3.8, 'По одной оси', 'Закрепите иглу', 'Итог'],
  prime: [4, 'Игла вверх', 'Проверьте подачу', 'Капля'],
  dial: [3, 'Селектор', 'Выбор дозы', 'Сверьте число'],
  skin: [4, 'Над кожей', 'Введите иглу', 'Итог'],
  hold: [4, 'Кнопка', 'Нажмите до «0»', 'Удерживайте'],
  pendispose: [4, 'После введения', 'Уберите иглу', 'Итог'],
  dissolve: [4.8, 'Игла во флаконе', 'Введите растворитель', 'Итог'],
  swirl: [4.8, 'Игла во флаконе', 'Покачивайте', 'Прозрачный раствор'],
  withdraw: [4.8, 'Игла в растворе', 'Оттяните поршень', 'Итог'],
  glucagoninject: [6, 'Введите иглу', 'Нажмите поршень', 'Итог'],
  sidewatch: [5, 'Положение на боку', 'Следите за дыханием', 'Оставайтесь рядом'],
};
const emergencyGuidePhaseCuts = {
  prick:[.38,.78], prime:[.48,.78], hold:[.15,.65], glucagoninject:[.4,.9],
  dissolve:[.2,.9], withdraw:[.2,.9], swirl:[.15,.85], dispose:[.15,.9], pendispose:[.15,.9],
  needle:[.15,.8], wash:[.15,.85], sidewatch:[.15,.85],
};
function emergencyGuideTimeline(scene) {
  const motion = emergencyGuideMotion[scene];
  if (!motion) return '';
  const [first, last] = emergencyGuidePhaseCuts[scene] || [.2,.75];
  return `<div class="aid-guide-timeline" aria-hidden="true" style="--aid-duration:${motion[0]}s;--aid-first:${motion[0]*first}s;--aid-middle:${motion[0]*(last-first)}s;--aid-last:${motion[0]*last}s"><div class="aid-guide-time-track"><span></span></div><div class="aid-guide-phases">${motion.slice(1).map((label,i)=>`<span style="--aid-phase:${i}">${label}</span>`).join('')}</div></div>`;
}

// Each detail explains the labelled feature using the instruction's existing facts.
const emergencyGuideDetailText = {
  wash:['Вымойте руки тёплой водой с мылом.', 'Полностью высушите руки: влага может исказить результат.'],
  strip:['Этим концом полоска входит в разъём глюкометра.', 'Этот край остаётся снаружи и впитывает кровь. Не трогайте его.'],
  prick:['Наконечник прокалывателя приложен сбоку к подушечке пальца.', 'Нужна маленькая капля. Не сдавливайте палец с силой.'],
  sample:['Впитывающий край касается капли; кровь не размазывают по полоске.', 'Держите полоску у капли до сигнала или начала отсчёта.'],
  result:['Перепишите число с экрана. Здесь показан только пример.', 'Проверьте единицы рядом с числом: ммоль/л или мг/дл.'],
  dispose:['Прижмите место прокола чистой салфеткой.', 'Использованный ланцет уберите в непрокалываемый закрывающийся контейнер.'],
  pencheck:['Сверьте название, концентрацию, срок годности и владельца ручки.', 'Назначенная доза должна соответствовать личному плану.'],
  needle:['Закрепляйте совместимую иглу прямо, по инструкции ручки.', 'До введения снимают наружный и внутренний защитные колпачки иглы.'],
  prime:['Для проверки поступления инсулина игла направлена вверх.', 'Если инсулин не появляется на кончике, следуйте инструкции устройства.'],
  dial:['Селектором выбирают подтверждённую дозу.', 'Проверьте число единиц в окошке по личному плану и расчёту.'],
  skin:['Выберите рекомендованное место без уплотнений; используйте новое место.', 'Способ введения зависит от иглы и человека. Используйте технику, которой вас обучили.'],
  hold:['Нажмите кнопку до конца: в окошке должно быть «0».', 'Удерживайте кнопку и иглу на время, указанное в инструкции именно этой ручки.'],
  pendispose:['Не храните ручку с присоединённой иглой.', 'Иглу безопасно снимают и убирают в контейнер для острых предметов.'],
  kit:['Нужен флакон с порошком именно из GlucaGen HypoKit.', 'Используйте только комплектный шприц с растворителем.'],
  dissolve:['Игла прокалывает резиновую пробку флакона.', 'Во флакон с порошком вводят весь комплектный растворитель.'],
  swirl:['Во время осторожного покачивания игла остаётся во флаконе.', 'Порошок должен раствориться полностью. Раствор — прозрачный, бесцветный, без частиц.'],
  withdraw:['При наборе дозы кончик иглы должен оставаться в растворе.', 'Оттяните поршень и проверьте дозу по инструкции набора для этого человека.'],
  glucagoninject:['Способ и место введения сверяют с инструкцией набора.', 'Введите подготовленную дозу по инструкции набора и отметьте время.'],
  sideprepare:['Удерживайте тыльную сторону дальней ладони у ближней щеки.', 'Согните дальнюю ногу в колене.'],
  sideturn:['Удерживая ладонь у щеки, осторожно поверните человека к себе за согнутое колено.', 'Верхняя нога помогает телу не перекатываться обратно.'],
  sidewatch:['Рот направлен вниз, чтобы жидкость могла вытекать.', 'Оставайтесь рядом и проверяйте, что дыхание остаётся нормальным.'],
};
// Each rendered illustration owns its paint definitions, including duplicate guides.
let aidArtSerial = 0;
function aidArtSurface(content) {
  const id = `aid-med-${++aidArtSerial}-`;
  const defs = `<defs>
    <linearGradient id="AID_PAINT_skin" x1="0" y1="0" x2=".25" y2="1"><stop stop-color="#f8dfc9"/><stop offset=".38" stop-color="#efc5aa"/><stop offset=".78" stop-color="#e8b59a"/><stop offset="1" stop-color="#c99078"/></linearGradient>
    <linearGradient id="AID_PAINT_skinSoft" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f7dbc3"/><stop offset=".55" stop-color="#ecc0a6"/><stop offset="1" stop-color="#d29e83"/></linearGradient>
    <linearGradient id="AID_PAINT_nail" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#faeee3"/><stop offset=".6" stop-color="#edc7b5"/><stop offset="1" stop-color="#d7a18f"/></linearGradient>
    <linearGradient id="AID_PAINT_device" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#63859b"/><stop offset=".25" stop-color="#36586d"/><stop offset=".67" stop-color="#203b54"/><stop offset="1" stop-color="#162e40"/></linearGradient>
    <linearGradient id="AID_PAINT_barrel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#203b54"/><stop offset=".18" stop-color="#537c94"/><stop offset=".36" stop-color="#7698ab"/><stop offset=".48" stop-color="#365b73"/><stop offset=".83" stop-color="#203b54"/><stop offset="1" stop-color="#152d40"/></linearGradient>
    <linearGradient id="AID_PAINT_metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#6b8090"/><stop offset=".25" stop-color="#e7edf0"/><stop offset=".5" stop-color="#b6c6cc"/><stop offset=".68" stop-color="#f9fcfa"/><stop offset="1" stop-color="#869ba6"/></linearGradient>
    <linearGradient id="AID_PAINT_glass" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#b4ced0" stop-opacity=".65"/><stop offset=".17" stop-color="#f9fdfb" stop-opacity=".9"/><stop offset=".36" stop-color="#fff" stop-opacity=".25"/><stop offset=".75" stop-color="#f6fcfa" stop-opacity=".75"/><stop offset="1" stop-color="#8eb4c0" stop-opacity=".55"/></linearGradient>
    <linearGradient id="AID_PAINT_screen" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#aec3b9"/><stop offset=".18" stop-color="#d4e2d8"/><stop offset="1" stop-color="#e6ece0"/></linearGradient>
    <linearGradient id="AID_PAINT_teal" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#63a9a5"/><stop offset=".55" stop-color="#348e91"/><stop offset="1" stop-color="#246773"/></linearGradient>
    <linearGradient id="AID_PAINT_trouser" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#8296a5"/><stop offset=".45" stop-color="#557285"/><stop offset="1" stop-color="#2c4b62"/></linearGradient>
    <linearGradient id="AID_PAINT_case" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#efb373"/><stop offset=".45" stop-color="#e5a155"/><stop offset="1" stop-color="#c57c3d"/></linearGradient>
    <linearGradient id="AID_PAINT_bin" x1="0" y1="0" x2="1" y2=".25"><stop stop-color="#d49748"/><stop offset=".23" stop-color="#f3c777"/><stop offset=".58" stop-color="#e8b65d"/><stop offset="1" stop-color="#c78d40"/></linearGradient>
    <linearGradient id="AID_PAINT_paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffefb"/><stop offset="1" stop-color="#e9e9df"/></linearGradient>
    <radialGradient id="AID_PAINT_shadow"><stop stop-color="#203b54" stop-opacity=".16"/><stop offset="1" stop-color="#203b54" stop-opacity="0"/></radialGradient>
  </defs>`;
  return (defs + `<g style="--aid-skin-fill:url(#AID_PAINT_skin);--aid-nail-fill:url(#AID_PAINT_nail);--aid-screen-fill:url(#AID_PAINT_screen);--aid-glass-fill:url(#AID_PAINT_glass);--aid-device-fill:url(#AID_PAINT_device)">${content}</g>`).replaceAll('AID_PAINT_', id);
}
function aidText(x, y, text, size = 18, cls = '') {
  return `<text x="${x}" y="${y}" text-anchor="middle" class="aid-art-text ${cls}" font-size="${size}">${text}</text>`;
}
function aidPoint(n, x, y, tx, ty, clearance = 0) {
  const distance = Math.hypot(x - tx, y - ty) || 1;
  const endX = tx + (x - tx) * clearance / distance;
  const endY = ty + (y - ty) * clearance / distance;
  return `<g class="aid-art-callout" data-aid-spot="${n}" data-aid-x="${tx}" data-aid-y="${ty}"><path d="M${x} ${y}L${endX} ${endY}"/>${clearance ? '' : `<circle cx="${tx}" cy="${ty}" r="3.5"/>`}<circle cx="${x}" cy="${y}" r="17" class="aid-art-number"/>${aidText(x, y + 6, n, 17)}</g>`;
}
function aidArrow(d, x, y, rotation = 0) {
  return `<g class="aid-art-arrow"><path d="${d}"/><path d="M-9-7 0 0-9 7" transform="translate(${x} ${y}) rotate(${rotation})"/></g>`;
}
function aidFinger(x, y, rotation = 0) {
  // Hand artwork is calibrated to its lateral fingertip (source pixel 72,309).
  // The sampling point is (-9,10), below the nail. A horizontal reflection
  // keeps the nail above the pad when the hand approaches from the left.
  const orientation = rotation === 180 ? 'scale(-1 1)' : `rotate(${rotation})`;
  return `<g transform="translate(${x} ${y}) ${orientation}" class="aid-anatomical-hand"><image data-art-part="sampling-hand" href="__MEDICAL_ART_HAND__" x="-21" y="-41.5" width="256" height="170.667" preserveAspectRatio="xMidYMid meet"/></g>`;
}
function aidDrop(x, y, cls = '') {
  return `<g transform="translate(${x} ${y}) scale(.5)" class="${cls}"><path d="M0-11C-4-6-9 0-9 5a9 9 0 0018 0C9 0 4-6 0-11Z" class="aid-blood"/><path d="M-4 1q-3 4-1 7" fill="none" stroke="#f4b3ad" stroke-width="2" stroke-linecap="round"/></g>`;
}
function aidMeter(x, y, display = 'drop', rotation = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rotation})"><ellipse cx="82" cy="219" rx="84" ry="15" fill="url(#AID_PAINT_shadow)"/>
    <path d="M35 0h88c22 0 34 16 35 39v128c0 36-23 53-79 53S0 203 0 167V39C1 16 13 0 35 0Z" fill="url(#AID_PAINT_device)" stroke="#203b54" stroke-width="1.7"/>
    <path d="M21 178V39c0-15 7-23 20-23h76c14 0 21 8 21 23v138" fill="none" stroke="#9cb1bc" stroke-opacity=".55" stroke-width="1.2"/>
    <path d="M9 142V39Q9 10 39 9h81" fill="none" stroke="#a3bcc7" stroke-width="2.5" stroke-linecap="round" opacity=".4"/>
    <rect x="13" y="34" width="132" height="113" rx="13" fill="#173142" stroke="#7c99a5" stroke-width="1"/>
    <rect x="19" y="40" width="120" height="101" rx="8" class="aid-screen"/>
    <path d="M22 57h114" stroke="#e7efe8" stroke-width="1" opacity=".65"/>
    ${display === 'blank' ? '' : display === 'drop' ? '<path d="M79 65C75 73 65 82 65 91a14 14 0 0028 0C93 82 83 73 79 65Z" class="aid-screen-icon"/>' : aidText(79, 106, display, 47, 'aid-display')}
    ${display === 'blank' ? '' : aidText(79, 128, display === '5,8' ? 'ммоль/л' : 'ГОТОВ К ИЗМЕРЕНИЮ', display === '5,8' ? 13 : 8, 'aid-display')}
    <path d="M35 160h87" stroke="#142c3c" stroke-width="1.4"/>
    <circle cx="79" cy="181" r="20" fill="#152e40" stroke="#547a8e"/><circle cx="79" cy="180" r="16" fill="url(#AID_PAINT_metal)" stroke="#bccbd0" stroke-width="1"/>
    <path d="m73 180 5 5 9-11" fill="none" stroke="#36646d" stroke-width="2.2" stroke-linecap="round"/>
    <path d="m39 179-5 3 5 3m80-6 5 3-5 3" fill="none" stroke="#a0b8c2" stroke-width="1.6"/>
    <rect x="63" y="-4" width="32" height="11" rx="4" fill="#0f2634" stroke="#a5b7be" stroke-width="1"/><path d="M68 0h22" stroke="#050f15" stroke-width="3"/>
  </g>`;
}
function aidLancet(x, y) {
  return `<g transform="translate(${x} ${y})"><path d="M15-16h135q17 0 22 16-5 16-22 16H15Q0 16 0 0t15-16Z" fill="url(#AID_PAINT_barrel)" stroke="#476572" stroke-width="1.3"/><path d="M13-10h121" stroke="#c2d5d9" stroke-width="1.3" opacity=".7"/><path d="M133-16h15q24 0 24 16t-24 16h-15Z" fill="url(#AID_PAINT_metal)" stroke="#829ca4" stroke-width="1.1"/><path d="M162-11q-6 11 0 22" fill="none" stroke="#7c949d" stroke-width="1.2"/><rect x="67" y="-20" width="27" height="9" rx="4" fill="url(#AID_PAINT_teal)" stroke="#366e78" stroke-width=".8"/><path d="M17-12v24M24-12v24M31-12v24" stroke="#97b0ba" stroke-width="1" opacity=".6"/></g>`;
}
function aidStrip(x, y, rotation = 0, sample = false) {
  return `<g transform="translate(${x} ${y}) rotate(${rotation})"><path d="M-10-91h20V2h-20Z" class="aid-strip"/><path d="M-7-88H7v8H-7Z" fill="${sample ? '#a45357' : '#dec49c'}"/><path d="M-2-91v17" stroke="${sample ? '#a33d49' : '#d1a77c'}" stroke-width="3"/><path d="M-6-19V2M0-19V2M6-19V2" stroke="#bba46a" stroke-width="3"/><path d="M-7-74H7v31H-7Z" fill="#e7efed"/><path d="M-3-69v21M3-69v21" stroke="#7eaaa7" stroke-width="1"/><path d="M-6-32h12" stroke="#5278a0" stroke-width="2"/></g>`;
}
function aidHand(x, y, rotation = 0, scale = 1) {
  return `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">
    <path d="M139 110l-23-29c-6-11-10-23-17-34L75-4c-3-7-8-9-12-5-4 3-3 8-1 14l10 31L48-14c-3-6-8-8-12-5-5 3-4 8-1 15l20 48L27 3c-4-6-9-7-13-3-3 4-1 9 3 15l25 42L19 36c-5-5-11-5-14 0-3 5 0 10 6 16l31 34c-11-5-25-13-32-8-5 4-4 10 3 16l27 21c14 11 27 14 47 13l32 15Z" class="aid-skin"/>
    <path d="m52 98 16-13c5-8 2-22-4-32m5 37c14 3 23 11 26 23M85 42l-10 5M61 28l-9 5M41 36l-8 6M24 59l-7 5M35 92l-4 7M76 118l27-3" class="aid-skin-line"/>
    <path d="m65-4 6 14-6 3-5-16q0-6 5-1M39-13l7 15-6 3-6-15q-1-7 5-3M17 5l9 13-5 4-10-14q-2-6 6-3M11 40l10 10-4 4-10-10q-2-6 4-4" class="aid-nail"/>
    <path d="M107 107q-3-19-17-33M49 68l-23-39M64 57l-16-38" class="aid-skin-highlight"/>
    <path d="M59 112q-8-6-10-14m29-2q7 9 7 14" fill="none" stroke="#dba78c" stroke-width="2" opacity=".6"/>
  </g>`;
}
function aidPen(x, y, rotation = 0, dose = '—', needle = true, cls = '') {
  return `<g transform="translate(${x} ${y}) rotate(${rotation})" class="${cls}">
    <path data-art-part="pen-body" d="M13-20h232q16 0 16 15V6q0 14-16 14H13Q1 20 0 10V-10Q1-20 13-20Z" fill="url(#AID_PAINT_barrel)" stroke="#203b54" stroke-width="1.5"/>
    <path d="M13-14h222" stroke="#b8cbd3" stroke-width="1.2" opacity=".7"/>
    <rect x="30" y="-17" width="92" height="34" rx="3" fill="url(#AID_PAINT_glass)" stroke="#a2bec6" stroke-width="1.1"/>
    <path d="M39-11h72v22H39Z" fill="#d9e9e6" fill-opacity=".6"/><path d="M44-13v26M61-13v26M79-13v26M98-13v26" stroke="#8babaf" stroke-width=".9"/>
    <path d="M36-10h79" stroke="#fff" stroke-width="2" opacity=".6"/>
    <rect x="131" y="-16" width="73" height="32" rx="6" fill="#132c3d" stroke="#8ca8b3" stroke-width=".8"/><rect x="137" y="-12" width="61" height="24" rx="3" class="aid-screen"/>
    ${cls === 'aid-pen-hold' ? `<g class="aid-dose-before">${aidText(168,7,'ЕД',21,'aid-display')}</g><g class="aid-dose-after">${aidText(168,7,'0',21,'aid-display')}</g>` : aidText(168,7,dose,21,'aid-display')}
    <path d="M122-20v40M218-20v40" stroke="#a6bac4" stroke-width="1.5"/><path d="M225-13h14" stroke="#839eab" stroke-width="1"/>
    <rect x="249" y="-22" width="27" height="44" rx="5" fill="url(#AID_PAINT_metal)" stroke="#65808d" stroke-width="1"/><g class="${cls === 'aid-pen-dial' ? 'aid-selector-turn' : ''}"><path d="M254-16v32M259-18v36M264-18v36M269-16v32" stroke="#849da9" stroke-width="1.2"/></g>
    <g class="${cls === 'aid-pen-hold' ? 'aid-press-button' : ''}"><rect x="276" y="-13" width="16" height="26" rx="5" fill="url(#AID_PAINT_teal)" stroke="#315f70" stroke-width="1"/><path d="M279-9h8" stroke="#add1cd" opacity=".7"/></g>
    ${needle ? '<rect data-art-part="pen-needle-hub" x="-18" y="-11" width="22" height="22" rx="4" fill="url(#AID_PAINT_glass)" stroke="#74929c" stroke-width="1.2"/><path d="M-13-7h13M-13-2h13M-13 4h13" stroke="#c1d4d7" stroke-width="1"/><path data-art-part="pen-needle" d="M-18 0h-24" class="aid-needle"/><path d="M-38-1h18" stroke="#fff" stroke-width=".7"/>' : '<path d="M-3-12h8v24h-8Z" fill="url(#AID_PAINT_metal)" stroke="#78949d" stroke-width="1"/>'}
  </g>`;
}
function aidVial(x, y, mode = 'full') {
  const inverted = mode === 'withdraw';
  return `<g transform="translate(${x} ${y})"><path d="M-23-61v25l-15 19v69q0 10 10 10h56q10 0 10-10v-69L23-36v-25Z" class="aid-glass"/>
    ${inverted ? '<path data-art-part="vial-withdraw-liquid" d="M-20-54h40v20l14 19V9h-68v-24l14-19Z" class="aid-vial-liquid aid-vial-draw"/>' : `<rect x="-34" y="6" width="68" height="50" rx="4" class="aid-vial-liquid ${mode === 'fill' ? 'aid-vial-fill' : ''}" ${mode === 'powder' ? 'opacity="0"' : ''}/>`}
    ${['powder','fill','mix'].includes(mode) ? `<path d="m-28 49 10-7 12 5 12-9 13 10 12-3v11h-59Z" class="aid-powder ${mode === 'mix' ? 'aid-powder-dissolve' : ''}"/>` : ''}
    <path d="M-32-15v65q0 5 5 5M30-17v64" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75"/>
    <path d="M-31 58h61" stroke="#8ca9ac" stroke-width="2" opacity=".4"/>
    <rect x="-26" y="-67" width="52" height="12" rx="3" fill="url(#AID_PAINT_metal)" stroke="#607d89" stroke-width="1.2"/><path d="M-21-63h42" stroke="#f5f7f3" stroke-width="1.3"/>
    <rect x="-12" y="-69" width="24" height="5" rx="2" fill="#68787b"/><path d="M-8-67H8" stroke="#8fa09e" stroke-width="1"/>
    ${mode === 'powder' ? `<path d="M-35-12q35 5 70 0v38q-35 5-70 0Z" fill="url(#AID_PAINT_paper)" stroke="#cdd8d3" stroke-width=".7"/>${aidText(0, 4, 'GlucaGen', 12, 'aid-display')}${aidText(0, 18, 'HypoKit', 10, 'aid-display')}` : ''}
  </g>`;
}
function aidSyringe(x, y, rotation = 0, mode = 'full') {
  const empty = mode === 'empty' || mode === 'out';
  return `<g transform="translate(${x} ${y}) rotate(${rotation})">
    <rect x="-17" y="-31" width="34" height="102" rx="4" class="aid-glass"/><rect x="-13" y="-21" width="26" height="87" class="aid-syringe-liquid ${mode === 'push' ? 'aid-fluid-out' : mode === 'pull' ? 'aid-fluid-in' : ''}" ${empty ? 'opacity="0"' : ''}/>
    <path d="M-12-23v83M12-24v83" stroke="#fff" stroke-width="1.3" opacity=".8"/><path d="M3-16h12M7-3h8M3 10h12M7 23h8M3 36h12M7 49h8" stroke="#527481" stroke-width="1.3"/>
    <path d="M-26-31h52" stroke="#819da7" stroke-width="7" stroke-linecap="round"/><path d="M-25-33h50" stroke="#e1ecea" stroke-width="3" stroke-linecap="round"/>
    <g class="aid-plunger ${mode === 'push' ? 'aid-plunger-down' : mode === 'pull' ? 'aid-plunger-up' : ''}" ${empty ? 'transform="translate(0 84)"' : ''}>
      <path d="M-4-120h8v101h-8Z" fill="#dce6e3" stroke="#819ba1" stroke-width="1"/><path d="M-1-116v91" stroke="#fff" stroke-width="1.7"/>
      <rect x="-14" y="-25" width="28" height="7" rx="2" fill="#314a55"/><path d="M-12-23h24" stroke="#607781" stroke-width="1.5"/>
      <path d="M-21-120h42" stroke="#75939f" stroke-width="8" stroke-linecap="round"/><path d="M-20-122h40" stroke="#e6eeeb" stroke-width="3" stroke-linecap="round"/>
    </g>
    <path d="M-7 71h14v11q0 4-7 4t-7-4Z" fill="#d8c0a1" fill-opacity=".8" stroke="#9d8c75" stroke-width="1"/><path d="M-3 74v7" stroke="#fff" opacity=".7"/>
    <path data-art-part="syringe-needle" d="M0 86v51" class="aid-needle"/><path d="M-.7 87v47" stroke="#fff" stroke-width=".6"/>
  </g>`;
}
function aidBin(x, y) {
  return `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="102" rx="66" ry="10" fill="url(#AID_PAINT_shadow)"/>
    <path d="M-54-40h108L46 92q-1 8-11 8h-70q-10 0-11-8Z" fill="url(#AID_PAINT_bin)" stroke="#ac7a38" stroke-width="1.5"/>
    <path d="M-43-26l7 112M41-25 34 86" stroke="#f8dd9e" stroke-width="3" opacity=".5"/>
    <rect x="-61" y="-54" width="122" height="20" rx="6" fill="#be843d" stroke="#95692e" stroke-width="1.5"/><path d="M-53-49h106" stroke="#e3b570" stroke-width="2"/>
    <rect x="-26" y="-50" width="52" height="10" rx="4" fill="#594933"/><path d="M-21-43h42" stroke="#896c42" stroke-width="1"/>
    <rect x="-33" y="0" width="66" height="64" rx="3" fill="url(#AID_PAINT_paper)" stroke="#c9a86d" stroke-width=".7"/><path d="M0 10 23 49h-46Z" fill="none" stroke="#916223" stroke-width="1.8"/>
    ${aidText(0, 40, '!', 23, 'aid-bin-mark')}${aidText(0, 84, 'ДЛЯ ИГЛ', 11, 'aid-bin-mark')}
  </g>`;
}
function aidTissue() {
  // Magnified cutaway of skin. The short pen needle ends inside the pale
  // subcutaneous layer and remains above the red muscle layer.
  return `<g>
    ${aidText(190,255,'Разрез кожи',14)}
    <path d="M131 289q0-17 22-17h334q22 0 22 17v82H131Z" fill="url(#AID_PAINT_skin)" stroke="#bc8a75" stroke-width="1.2"/>
    <path data-art-part="subcutaneous-layer" d="M131 280h378v71H131Z" fill="#efdcb3"/>
    <path d="M131 351h378v20H131Z" fill="#c48279"/>
    <path d="M142 323q10-14 21 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0M152 342q10-13 20 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0" stroke="#d1b785" stroke-width="1" fill="none" opacity=".8"/>
    <path d="M137 358h366M137 365h366" stroke="#e3b3a4" stroke-width="1.2" opacity=".7"/>
    <path data-art-part="skin-surface" d="M131 281q0-9 22-9h334q22 0 22 9" stroke="#bc8a6e" stroke-width="1.8" fill="none"/><path d="M147 276h346" stroke="#f9e2ce" stroke-width="3" opacity=".8"/>
    <path d="M162 277v9m37-9v9m40-9v9m164-9v9m37-9v9m34-9v9" stroke="#c68e76" stroke-width=".8" opacity=".5"/>
  </g>`;
}
function aidPerson(side = true) {
  // These two checked atlas poses share one scale and floor orientation.
  // The person never rotates as a rigid bitmap: the arrow explains the turn,
  // while each step shows the full, anatomically complete destination pose.
  const asset = side ? '__MEDICAL_ART_RECOVERY_SIDE__' : '__MEDICAL_ART_RECOVERY_PREPARE__';
  return `<image data-art-part="recovery-person" href="${asset}" x="10" y="45" width="620" height="413.333" preserveAspectRatio="xMidYMid meet"/>`;
}
function emergencyGuideScene(name, title) {
  let scene = '';
  if (name === 'wash') {
    scene = `<path d="M109 97V70h78q33 0 33 33v22h-33v-15q0-8-9-8h-36v34h-33Z" fill="url(#AID_PAINT_metal)" stroke="#78939c" stroke-width="1.4"/><path d="M114 79h70q26 0 26 27v11" fill="none" stroke="#fffdf7" stroke-width="2" opacity=".8"/><path d="M185 123h36" stroke="#617b87" stroke-width="4"/><path d="M119 65V53h33" fill="none" stroke="#738e98" stroke-width="7" stroke-linecap="round"/>
      <image href="__MEDICAL_ART_WASH__" x="65" y="135" width="360" height="240" preserveAspectRatio="xMidYMid meet"/>
      <path d="M193 132v57M207 132v62M220 132v54" class="aid-water aid-wash-water"/>
      <path d="M447 137h83q12 0 11 15l-7 151-14 7-15-7-16 5-17-6-16 6-17-9V151q0-14 8-14Z" fill="url(#AID_PAINT_paper)" stroke="#c5cbc2" stroke-width="1.2"/><path d="M451 154v131M461 154v135M473 154v131" stroke="#c9d8d4" stroke-width="3" opacity=".7"/>
      ${aidPoint(1, 84, 205, 216, 230)}${aidPoint(2, 521, 91, 493, 144)}`;
  } else if (name === 'strip') {
    scene = `<g class="aid-insert-strip">${aidStrip(322, 183)}</g>${aidMeter(243, 163)}${aidArrow('M392 80v49',392,129,90)}${aidPoint(1, 446, 183, 328, 168)}${aidPoint(2, 177, 67, 312, 96)}`;
  } else if (name === 'prick') {
    scene = `${aidFinger(335, 214)}<g class="aid-lancet-touch">${aidLancet(116,224)}</g><g class="aid-reveal-drop">${aidDrop(326, 224)}</g>${aidArrow('M214 153h83',297,153)}${aidPoint(1, 124, 112, 273, 224)}${aidPoint(2, 445, 313, 327, 235)}`;
  } else if (name === 'sample') {
    scene = `<g transform="translate(9 48)">${aidStrip(304, 180, -90, true)}${aidMeter(284, 259, 'drop', -90)}<g class="aid-sample-touch">${aidFinger(207, 170,180)}${aidDrop(217.5,180)}</g></g>${aidPoint(1, 214, 105, 227, 228)}${aidPoint(2, 494, 98, 407, 212)}${aidArrow('M103 303h73',176,303)}`;
  } else if (name === 'result') {
    scene = `${aidStrip(318,131,0,true)}${aidMeter(239, 111, '5,8')}${aidPoint(1, 144, 180, 274, 204)}${aidPoint(2, 476, 269, 329, 238)}<rect x="253" y="346" width="133" height="28" rx="14" fill="#e7edf9"/>${aidText(319, 365, 'ПРИМЕР ЧИСЛА', 12,'aid-on-paper')}`;
  } else if (name === 'dispose') {
    scene = `${aidFinger(135,183)}<rect x="123" y="178" width="61" height="56" rx="6" fill="#fff" stroke="#c4cfdb" stroke-width="2" transform="rotate(-10 154 206)"/><path d="M134 198h39M137 209h31" stroke="#e0e6ec" stroke-width="3"/>${aidBin(449,260)}<g class="aid-dispose-lancet"><rect x="440" y="102" width="18" height="48" rx="4" fill="#93c7db" stroke="#55849b" stroke-width="2"/><path d="M449 150v18" class="aid-needle"/></g>${aidPoint(1, 138, 112, 154, 198)}${aidPoint(2, 539, 153, 452, 213)}`;
  } else if (name === 'pencheck') {
    scene = `${aidPen(173,141,0,'—',false)}<rect x="162" y="201" width="314" height="126" rx="16" fill="#fff" stroke="#cbd5e2" stroke-width="2"/><rect x="182" y="222" width="45" height="45" rx="13" fill="#e3f3f0"/><path d="m194 244 8 8 15-19" fill="none" stroke="#087f87" stroke-width="4" stroke-linecap="round"/>${aidText(340,240,'ЛИЧНЫЙ ПЛАН',15,'aid-on-paper')}<path d="M253 260h180M184 290h249" stroke="#dbe3ee" stroke-width="7" stroke-linecap="round"/>${aidPoint(1,126,72,240,143)}${aidPoint(2,538,281,461,267)}`;
  } else if (name === 'needle') {
    scene = `${aidPen(270,171,0,'—',false)}<g class="aid-attach-needle"><rect x="242" y="160" width="29" height="22" rx="4" fill="#eaf1f7" stroke="#6b849c" stroke-width="2"/><path d="M242 171h-27" class="aid-needle"/></g><g><path d="M119 239h57q7 0 7 10v37q0 10-7 10h-57q-17 0-17-28t17-29Z" fill="#e9eff6" stroke="#b5c5d8" stroke-width="2"/><path d="M206 254h30v29h-30q-10 0-10-15t10-14Z" fill="#bad8e6" stroke="#779fb4" stroke-width="2"/></g>${aidArrow('M177 121h59',236,121)}${aidPoint(1,369,93,264,171)}${aidPoint(2,174,347,181,277)}`;
  } else if (name === 'prime') {
    scene = `${aidPen(303,97,90,'—')}<g class="aid-prime-drop"><path d="M303 46c-1 2-4 4-4 6a4 4 0 008 0c0-2-3-4-4-6Z" fill="#c9e5e1" stroke="#7cabae" stroke-width=".9"/><path d="M301 50v2" stroke="#fff" stroke-width="1" stroke-linecap="round"/></g>${aidPoint(1,163,125,304,66)}${aidPoint(2,439,69,309,55)}`;
  } else if (name === 'dial') {
    scene = `${aidPen(167,205,0,'ЕД',true,'aid-pen-dial')}<g class="aid-dial-turn">${aidArrow('M416 153q39-30 66 4',482,157,50)}</g><rect x="275" y="265" width="143" height="39" rx="12" fill="#fff" stroke="#cbd6e5"/>${aidText(346,290,'По личному плану',14,'aid-on-paper')}${aidPoint(1,529,109,435,185)}${aidPoint(2,253,102,332,205)}`;
  } else if (name === 'skin' || name === 'hold') {
    scene = `${aidTissue()}<g class="${name === 'skin' ? 'aid-pen-insert' : ''}"><g transform="translate(321 258) rotate(-90) scale(.72)">${aidPen(0,0,0,name === 'hold' ? '0' : 'ЕД',true,name === 'hold' ? 'aid-pen-hold' : '')}</g></g>${name === 'hold' ? aidPoint(1,146,128,322,53) : aidPoint(1,146,220,260,272)}${name === 'hold' ? aidPoint(2,522,176,473,117) : aidPoint(2,477,232,321,288)}${aidText(320,397,'Угол и складка — по вашей технике',17)}${name === 'hold' ? '<g transform="translate(472 117)"><circle r="29" fill="#fff" stroke="#bacade" stroke-width="2"/><path d="M0-16V1l13 8" fill="none" stroke="#315bd6" stroke-width="3" stroke-linecap="round"/></g>' : aidArrow('M386 163v67',386,230,90)}`;
  } else if (name === 'pendispose') {
    scene = `${aidPen(132,144,0,'0',false)}${aidBin(450,259)}<g class="aid-dispose-needle"><rect x="440" y="96" width="20" height="20" rx="4" fill="#e9eff6" stroke="#6b849c" stroke-width="2"/><path d="M450 116v27" class="aid-needle"/></g><rect x="116" y="230" width="204" height="74" rx="14" fill="#fff" stroke="#ccd7e4"/>${aidText(218,259,'Доза + время',20,'aid-on-paper')}${aidText(218,283,'Запишите введение',14,'aid-on-paper')}${aidPoint(1,99,82,131,143)}${aidPoint(2,547,153,451,214)}`;
  } else if (name === 'kit') {
    scene = `<ellipse cx="320" cy="338" rx="250" ry="20" fill="url(#AID_PAINT_shadow)"/><rect x="82" y="93" width="476" height="245" rx="22" fill="url(#AID_PAINT_case)" stroke="#b57740" stroke-width="1.8"/><rect x="88" y="99" width="464" height="233" rx="18" fill="none" stroke="#f7ce91" stroke-width="1.5"/><path d="M93 168h454" stroke="#c48341" stroke-width="3"/><path d="M209 163v12m218-12v12" stroke="#f7c079" stroke-width="14" stroke-linecap="round"/><rect x="99" y="111" width="442" height="45" rx="6" fill="url(#AID_PAINT_paper)" stroke="#bc925a" stroke-width=".8"/>${aidText(320,140,'GlucaGen HypoKit',24,'aid-on-paper')}<rect x="100" y="181" width="125" height="141" rx="16" fill="#bf8147" fill-opacity=".4" stroke="#f3bf7f" stroke-width="1"/><rect x="236" y="181" width="306" height="141" rx="16" fill="#bf8147" fill-opacity=".4" stroke="#f3bf7f" stroke-width="1"/>${aidVial(162,253,'powder')}${aidSyringe(385,247,90,'full')}<rect x="244" y="238" width="65" height="18" rx="7" fill="#f5d5af" stroke="#ba8550" stroke-width="2"/><rect x="132" y="179" width="60" height="15" rx="5" fill="#e97b35"/>${aidPoint(1,161,52,161,189)}${aidPoint(2,438,53,415,247)}`;
  } else if (name === 'dissolve') {
    scene = `${aidVial(320,318,'fill')}${aidSyringe(320,139,0,'push')}${aidArrow('M393 81v77',393,158,90)}${aidPoint(1,166,223,319,250)}${aidPoint(2,471,325,337,346)}`;
  } else if (name === 'swirl') {
    scene = `<g class="aid-swirl-kit">${aidVial(320,318,'mix')}${aidSyringe(320,139,0,'empty')}</g>${aidArrow('M250 308q-32 41 31 58',281,366,12)}${aidArrow('M390 309q32-41-20-62',370,247,-145)}${aidPoint(1,155,189,318,251)}${aidPoint(2,465,371,333,339)}`;
  } else if (name === 'withdraw') {
    scene = `<g transform="translate(640 430) rotate(180)">${aidVial(320,318,'withdraw')}${aidSyringe(320,139,0,'pull')}</g>${aidArrow('M393 280v72',393,352,90)}${aidPoint(1,173,70,321,153)}${aidPoint(2,478,340,321,410)}`;
  } else if (name === 'glucagoninject') {
    // The skin is opaque: only the part of the needle ABOVE its surface is
    // visible. This is a normal outside view, not an anatomical cutaway.
    scene = `<image data-art-part="outer-thigh" href="__MEDICAL_ART_THIGH__" x="40" y="175" width="560" height="373.333" preserveAspectRatio="xMidYMid meet"/>
      <defs><clipPath id="AID_PAINT_thigh-surface"><path d="M0 0H640V272H0Z"/></clipPath></defs>
      <g clip-path="url(#AID_PAINT_thigh-surface)"><g class="aid-glucagon-insert">${aidSyringe(320,182,0,'push')}</g></g>
      ${aidPoint(1,127,183,270,318)}${aidPoint(2,474,104,324,153)}`;
  } else if (name === 'sideprepare') {
    scene = `${aidPerson(false)}${aidPoint(1,42,291,91,239,12)}${aidPoint(2,535,79,422,110,12)}`;
  } else if (name === 'sideturn') {
    scene = `${aidPerson(true)}${aidArrow('M354 73q83 18 90 92',444,165,85)}${aidPoint(1,286,62,380,82,8)}${aidPoint(2,527,381,369,307,12)}`;
  } else if (name === 'sidewatch') {
    scene = `${aidPerson(true)}<path d="M212 202q24-22 54-2" class="aid-breath-line"/>${aidPoint(1,38,152,72,206,15)}${aidPoint(2,342,79,241,202,12)}`;
  }

  return `<svg class="aid-guide-illustration" data-aid-scene="${name}" viewBox="0 0 640 430" role="img" aria-label="${title}"><title>${title}</title>${aidArtSurface(scene)}</svg>`;
}

function emergencyGuideReducedMotion() {
  return (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) || (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion'));
}
// Supplies reuse the same device geometry as the instruction, in a stable view.
const emergencyGuideSupplies = {
  measure: [
    ['Глюкометр', 'Для измерения сахара', () => aidMeter(242, 112)],
    ['Тест-полоска', 'Новая, подходит к прибору', () => `<g transform="translate(319 270) scale(1.8)">${aidStrip(0, 0)}</g>`],
    ['Прокалыватель', 'С новым личным ланцетом', () => aidLancet(234,217)],
    ['Салфетка и контейнер', 'Для завершения измерения', () => `<rect x="135" y="158" width="125" height="116" rx="9" fill="#fff" stroke="#c4cfdb" stroke-width="3"/>${aidBin(413, 206)}`],
  ],
  insulin: [
    ['Личная ручка', 'Название и доза — по назначению', () => aidPen(165, 215, 0, '—', false)],
    ['Совместимая игла', 'Новая, в закрытой упаковке', () => `<rect x="242" y="174" width="155" height="86" rx="15" fill="#fff" stroke="#94a9c2" stroke-width="3"/><rect x="315" y="201" width="34" height="26" rx="4" fill="#eaf1f7" stroke="#6b849c" stroke-width="2"/><path d="M315 214h-40" class="aid-needle"/>`],
    ['Контейнер для игл', 'Непрокалываемый, с крышкой', () => aidBin(320, 195)],
  ],
  glucagon: [
    ['Флакон с порошком', 'Из набора GlucaGen HypoKit', () => `<g transform="translate(0 -20)">${aidVial(320, 240, 'powder')}</g>`],
    ['Шприц с растворителем', 'Из того же набора', () => aidSyringe(320, 217, 90, 'full')],
    ['Листок-вкладыш', 'Для проверки дозы и способа', () => `<rect x="245" y="105" width="150" height="220" rx="12" fill="#fff" stroke="#94a9c2" stroke-width="3"/>${aidText(320, 159, 'GlucaGen', 19, 'aid-on-paper')}<path d="M270 190h100M270 219h100M270 248h75" stroke="#b8c9df" stroke-width="8" stroke-linecap="round"/>`],
  ],
};
function emergencyGuidePreparation(kind, open = false) {
  const supplies = emergencyGuideSupplies[kind];
  if (!supplies) return '';
  return `<details class="aid-guide-preparation" ${open ? 'open' : ''}><summary><span><strong>Что понадобится</strong></span><span aria-hidden="true">＋</span></summary><div class="aid-guide-supplies">${supplies.map(([label, description, draw]) => `<div class="aid-guide-supply"><svg viewBox="0 0 640 430" aria-hidden="true">${aidArtSurface(draw())}</svg><strong>${label}</strong><span>${description}</span></div>`).join('')}</div><button type="button" data-aid-guide-action="prepared">Всё готово · начать <span aria-hidden="true">↓</span></button></details>`;
}
function emergencyGuideSpeechMarkup() {
  return `<div class="aid-guide-speech" aria-label="Озвучивание инструкции"><div class="aid-guide-speech-controls"><button type="button" data-aid-guide-action="speak" aria-label="Слушать текст текущего шага голосом устройства"><span aria-hidden="true">▷</span> Слушать шаг</button><button type="button" data-aid-guide-action="speech-pause" hidden aria-pressed="false">Пауза</button><button type="button" data-aid-guide-action="speech-stop" hidden>Стоп</button></div><span class="aid-guide-speech-status" role="status"></span></div>`;
}
function emergencyGuideInner(kind, index = 0, paused = false, options = {}) {
  const reduced = emergencyGuideReducedMotion();
  const guide = emergencyGuideContent[kind];
  let [title, instruction, note, scene] = guide.steps[index];
  let action = emergencyGuideActions[scene];
  if (options.training && kind === 'measure' && scene === 'result') {
    instruction = 'Прочитайте число и единицы с экрана глюкометра. После инструкции вы попробуете перенести учебное значение в поле результата.';
    action = 'Прочитайте число и единицы. Затем перенесите учебное значение в поле результата.';
    note = 'На рисунке учебный пример. В задании после инструкции перепишите число и единицы с учебного экрана.';
  }
  const last = index === guide.steps.length - 1;
  const moving = Boolean(emergencyGuideMotion[scene]);
  const motionStatus = reduced ? 'reduced' : !moving ? 'static' : paused ? 'paused' : 'playing';
  const motionLabel = reduced ? 'Без движения' : !moving ? 'Схема' : paused ? 'На паузе' : 'Показ движения';
  return `<div class="aid-guide-top"><div><h3>${guide.title}</h3><p>${guide.subtitle}</p></div></div>
    <p class="aid-guide-notice"><span aria-hidden="true">!</span>${guide.notice}</p>
    ${index === 0 ? emergencyGuidePreparation(kind, true) : ''}
    <nav class="aid-guide-progress" aria-label="Шаги инструкции">${guide.steps.map((step, i) => `<button type="button" data-aid-guide-action="jump" data-aid-guide-target="${i}" class="${i < index ? 'is-complete' : ''} ${i === index ? 'is-current' : ''}" ${i === index ? 'aria-current="step"' : ''} aria-label="Шаг ${i + 1}: ${step[0]}"><span>${i + 1}</span><span class="aid-rail-label">${step[0]}</span></button>`).join('')}</nav>
    <div class="aid-guide-stage">
      <div class="aid-guide-step-heading" aria-live="polite" aria-atomic="true"><span class="aid-guide-step-count">Шаг ${index + 1} <span>из ${guide.steps.length}</span></span><h4 tabindex="-1">${title}</h4></div>
      <div class="aid-guide-picture" data-aid-motion-status="${motionStatus}">
        <div class="aid-guide-canvas">${emergencyGuideScene(scene,title)}</div>
        <button type="button" class="aid-guide-overview" data-aid-guide-action="overview" hidden>← Общий вид</button>
        <ol class="aid-guide-legend" aria-label="Увеличить деталь рисунка">${emergencyGuideScenes[scene].map((text,i)=>`<li><button type="button" data-aid-guide-action="detail" data-aid-detail="${i+1}" aria-pressed="false" aria-label="Увеличить: ${text}"><span class="aid-legend-number">${i+1}</span><span>${text}</span><span class="aid-detail-plus" aria-hidden="true">＋</span></button></li>`).join('')}</ol>
        <p class="aid-guide-detail-caption" role="status" hidden></p>
        ${emergencyGuideTimeline(scene)}
        <div class="aid-guide-playback"><span class="aid-guide-motion-status" role="status">${motionLabel}</span><div><button type="button" class="aid-guide-motion" data-aid-guide-action="motion" ${reduced || !moving ? 'disabled hidden' : ''} aria-pressed="${paused}" aria-label="${paused ? 'Продолжить анимацию' : 'Приостановить анимацию'}">${paused ? '▷ Продолжить' : 'Ⅱ Пауза'}</button><button type="button" class="aid-guide-replay" data-aid-guide-action="replay" ${reduced || !moving ? 'disabled hidden' : ''} aria-label="Повторить движение текущего шага"><span aria-hidden="true">↻</span> Повторить</button></div></div>
        <span class="aid-guide-picture-caption">${scene === 'hold' ? 'Шкала показывает анимацию. Время удержания — по инструкции ручки.' : 'Схема · вид устройства может отличаться'}</span>
      </div>
      <div class="aid-guide-copy"><p>${action}</p><div class="aid-guide-note"><strong>Важно</strong>${note}</div><details class="aid-guide-explanation"><summary>Подробнее о шаге</summary><p>${instruction}</p></details>${emergencyGuideSpeechMarkup()}</div>
    </div>
    <div class="aid-guide-controls"><button type="button" data-aid-guide-action="previous" ${index === 0 ? 'disabled' : ''}><span aria-hidden="true">←</span> Назад</button><span aria-hidden="true">${index + 1} / ${guide.steps.length}</span><button type="button" class="aid-guide-next" data-aid-guide-action="${last ? (kind === 'measure' ? 'reading' : 'restart') : 'next'}">${last ? (kind === 'measure' ? 'Ввести результат ↓' : 'Сначала ↻') : 'Далее →'}</button></div>`;
}
function emergencyGuideMarkup(kind = 'measure', options = {}) {
  if (!Object.prototype.hasOwnProperty.call(emergencyGuideContent, kind)) return '';
  const paused = emergencyGuideReducedMotion();
  const target = typeof options.readingTarget === 'string' && /^[A-Za-z][A-Za-z0-9_-]*$/.test(options.readingTarget) ? options.readingTarget : 'emergencySugarValue';
  return `<section class="aid-guide${paused ? ' is-paused' : ''}" data-aid-guide="${kind}" data-aid-guide-step="0" data-aid-reading-target="${target}" ${options.training ? 'data-aid-training="true"' : ''} aria-label="${emergencyGuideContent[kind].title}">${emergencyGuideInner(kind,0,paused,options)}</section>`;
}
// Only local Russian voices may be selected. Never fall back to a browser's default
// voice: it may send the instruction to an online speech service.
let emergencyGuideSpeechSession = null;
let emergencyGuideSpeechObserver = null;
function emergencyGuideSpeechStatus(viewer, text, active = false, paused = false) {
  const status = viewer?.querySelector('.aid-guide-speech-status');
  if (status) status.textContent = text;
  const pause = viewer?.querySelector('[data-aid-guide-action="speech-pause"]');
  const stop = viewer?.querySelector('[data-aid-guide-action="speech-stop"]');
  if (pause) { pause.hidden = !active; pause.textContent = paused ? 'Продолжить' : 'Пауза'; pause.setAttribute('aria-pressed', String(paused)); }
  if (stop) stop.hidden = !active;
}
function emergencyGuideStopSpeech(message = 'Озвучивание остановлено') {
  const session = emergencyGuideSpeechSession;
  emergencyGuideSpeechSession = null;
  if (!session) return;
  session.utterance.onend = null;
  session.utterance.onerror = null;
  window.speechSynthesis?.cancel();
  emergencyGuideSpeechStatus(session.viewer, message);
}
function emergencyGuideSpeak(viewer) {
  emergencyGuideStopSpeech();
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') {
    emergencyGuideSpeechStatus(viewer, 'Этот браузер не поддерживает озвучивание. Прочитайте шаг на экране.');
    return;
  }
  const voice = synth.getVoices().find(item => item.localService === true && /^ru(?:[-_]|$)/i.test(item.lang));
  if (!voice) {
    emergencyGuideSpeechStatus(viewer, 'Локальный русский голос пока недоступен. Попробуйте ещё раз или проверьте настройки речи устройства. Текст шага остаётся на экране.');
    return;
  }
  const guide = emergencyGuideContent[viewer.dataset.aidGuide];
  const index = Number(viewer.dataset.aidGuideStep) || 0;
  const title = viewer.querySelector('.aid-guide-step-heading h4').textContent;
  const instruction = viewer.querySelector('.aid-guide-explanation > p').textContent;
  const note = viewer.querySelector('.aid-guide-note').textContent.replace(/^Важно/,'');
  const utterance = new window.SpeechSynthesisUtterance(`Шаг ${index + 1}. ${title}. ${instruction} Обратите внимание. ${note}`);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = .9;
  const session = {viewer, utterance, paused:false};
  emergencyGuideSpeechSession = session;
  const finish = message => { if (emergencyGuideSpeechSession !== session) return; emergencyGuideSpeechSession = null; emergencyGuideSpeechStatus(viewer,message); };
  utterance.onend = () => finish('Шаг прочитан. Можно прослушать ещё раз.');
  utterance.onerror = () => finish('Не удалось озвучить шаг. Прочитайте текст на экране.');
  try {
    synth.speak(utterance);
    emergencyGuideSpeechStatus(viewer, 'Читаю текущий шаг · локальный голос', true);
    viewer.querySelector('[data-aid-guide-action="speak"]').textContent = '↻ Послушать ещё раз';
  } catch (_) { finish('Не удалось озвучить шаг. Прочитайте текст на экране.'); }
}
function emergencyGuideRestoreOverview(viewer) {
  const picture = viewer.querySelector('.aid-guide-picture');
  picture?.classList.remove('is-detail');
  viewer.querySelector('.aid-guide-illustration')?.setAttribute('viewBox','0 0 640 430');
  viewer.querySelectorAll('[data-aid-guide-action="detail"]').forEach(button => button.setAttribute('aria-pressed','false'));
  const overview = viewer.querySelector('.aid-guide-overview');
  const caption = viewer.querySelector('.aid-guide-detail-caption');
  if (overview) overview.hidden = true;
  if (caption) { caption.hidden = true; caption.textContent = ''; }
}
function emergencyGuideShowDetail(viewer, number) {
  const svg = viewer.querySelector('.aid-guide-illustration');
  const spot = svg?.querySelector(`[data-aid-spot="${number}"]`);
  if (!spot) return;
  const width = 270, height = 205;
  const x = Math.max(0,Math.min(640-width,Number(spot.dataset.aidX)-width/2));
  const y = Math.max(0,Math.min(430-height,Number(spot.dataset.aidY)-height/2));
  svg.setAttribute('viewBox',`${x} ${y} ${width} ${height}`);
  viewer.querySelector('.aid-guide-picture').classList.add('is-detail','is-still');
  const motion = viewer.querySelector('[data-aid-guide-action="motion"]');
  motion.disabled = true;
  motion.hidden = true;
  emergencyGuideSetMotionStatus(viewer,'finished','Деталь · итог');
  viewer.querySelector('.aid-guide-overview').hidden = false;
  viewer.querySelectorAll('[data-aid-guide-action="detail"]').forEach(button => button.setAttribute('aria-pressed',String(Number(button.dataset.aidDetail) === number)));
  const scene = svg.dataset.aidScene;
  const caption = viewer.querySelector('.aid-guide-detail-caption');
  caption.textContent = emergencyGuideDetailText[scene][number-1];
  caption.hidden = false;
}
function emergencyGuideSetMotionStatus(viewer, status, label) {
  const picture = viewer.querySelector('.aid-guide-picture');
  if (!picture) return;
  picture.dataset.aidMotionStatus = status;
  const labels = {playing:'Показ движения', paused:'На паузе', finished:'Итог движения', reduced:'Без движения', static:'Схема'};
  picture.querySelector('.aid-guide-motion-status').textContent = label || labels[status];
  const button = picture.querySelector('[data-aid-guide-action="motion"]');
  button.disabled = !['playing','paused'].includes(status);
  button.hidden = button.disabled;
  button.setAttribute('aria-pressed',String(status === 'paused'));
  button.textContent = status === 'paused' ? '▷ Продолжить' : 'Ⅱ Пауза';
  button.setAttribute('aria-label',status === 'paused' ? 'Продолжить анимацию' : 'Приостановить анимацию');
}
function emergencyGuideSyncMotionPreference() {
  document.querySelectorAll('[data-aid-guide]').forEach(viewer => {
    const picture = viewer.querySelector('.aid-guide-picture');
    if (!picture) return;
    const scene = viewer.querySelector('.aid-guide-illustration')?.dataset.aidScene;
    const replay = picture.querySelector('[data-aid-guide-action="replay"]');
    if (emergencyGuideReducedMotion()) {
      viewer.classList.add('is-paused');
      picture.classList.add('is-still');
      emergencyGuideSetMotionStatus(viewer,'reduced');
      replay.disabled = true; replay.hidden = true;
    } else if (picture.dataset.aidMotionStatus === 'reduced') {
      // Changing an accessibility preference cannot replay an injection silently.
      viewer.classList.remove('is-paused');
      picture.classList.add('is-still');
      emergencyGuideSetMotionStatus(viewer,emergencyGuideMotion[scene] ? 'finished' : 'static');
      replay.disabled = !emergencyGuideMotion[scene]; replay.hidden = replay.disabled;
    }
  });
}
const emergencyGuideBoundContainers = new WeakSet();
function bindEmergencyGuides(container = document) {
  if (!container?.addEventListener || emergencyGuideBoundContainers.has(container)) return;
  emergencyGuideBoundContainers.add(container);
  if (!emergencyGuideSpeechObserver && typeof MutationObserver === 'function') {
    emergencyGuideSpeechObserver = new MutationObserver(records => {
      if (records.some(record => record.target === document.documentElement && record.attributeName === 'class')) emergencyGuideSyncMotionPreference();
      const viewer = emergencyGuideSpeechSession?.viewer;
      if (viewer && (!viewer.isConnected || !viewer.getClientRects().length)) emergencyGuideStopSpeech();
    });
    emergencyGuideSpeechObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','open','style']});
    document.addEventListener('visibilitychange',() => { if (document.hidden) emergencyGuideStopSpeech(); });
    window.addEventListener('pagehide',() => emergencyGuideStopSpeech());
    if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',emergencyGuideSyncMotionPreference);
  }
  container.addEventListener('animationend', event => {
    if (event.animationName !== 'aid-guide-elapsed') return;
    const viewer = event.target.closest('[data-aid-guide]');
    if (viewer && viewer.querySelector('.aid-guide-picture').dataset.aidMotionStatus === 'playing') emergencyGuideSetMotionStatus(viewer,'finished');
  });
  container.addEventListener('click', (event) => {
    const spot = event.target.closest('[data-aid-spot]');
    if (spot && container.contains(spot)) {
      const viewer = spot.closest('[data-aid-guide]');
      if (viewer) {
        if (emergencyGuideSpeechSession && emergencyGuideSpeechSession.viewer !== viewer) emergencyGuideStopSpeech();
        emergencyGuideShowDetail(viewer,Number(spot.dataset.aidSpot));
      }
      return;
    }
    const button = event.target.closest('[data-aid-guide-action]');
    if (!button || !container.contains(button) || button.disabled) return;
    const viewer = button.closest('[data-aid-guide]');
    if (!viewer) return;
    const kind = viewer.dataset.aidGuide;
    if (!Object.prototype.hasOwnProperty.call(emergencyGuideContent, kind)) return;
    const action = button.dataset.aidGuideAction;
    if (emergencyGuideSpeechSession && emergencyGuideSpeechSession.viewer !== viewer) emergencyGuideStopSpeech();
    const total = emergencyGuideContent[kind].steps.length;
    let index = Number(viewer.dataset.aidGuideStep) || 0;
    let paused = viewer.classList.contains('is-paused');
    if (action === 'speak') { emergencyGuideSpeak(viewer); return; }
    if (action === 'speech-stop') { emergencyGuideStopSpeech(); viewer.querySelector('[data-aid-guide-action="speak"]')?.focus({preventScroll:true}); return; }
    if (action === 'speech-pause') {
      const session = emergencyGuideSpeechSession;
      if (session?.viewer !== viewer) return;
      session.paused = !session.paused;
      window.speechSynthesis[session.paused ? 'pause' : 'resume']();
      emergencyGuideSpeechStatus(viewer,session.paused ? 'Чтение на паузе' : 'Читаю текущий шаг · локальный голос',true,session.paused);
      return;
    }
    if (action === 'detail') { emergencyGuideShowDetail(viewer,Number(button.dataset.aidDetail)); return; }
    if (action === 'overview') { emergencyGuideRestoreOverview(viewer); emergencyGuideSetMotionStatus(viewer,emergencyGuideReducedMotion() ? 'reduced' : emergencyGuideMotion[viewer.querySelector('.aid-guide-illustration').dataset.aidScene] ? 'finished' : 'static'); viewer.querySelector('[data-aid-guide-action="detail"]')?.focus({preventScroll:true}); return; }
    if (action === 'prepared') {
      viewer.querySelector('.aid-guide-preparation').open = false;
      viewer.querySelector('.aid-guide-step-heading h4')?.focus({preventScroll:true});
      viewer.querySelector('.aid-guide-stage')?.scrollIntoView({block:'start',behavior:'auto'});
      return;
    }
    if (action === 'reading') {
      emergencyGuideStopSpeech();
      const targetId = viewer.dataset.aidReadingTarget || 'emergencySugarValue';
      viewer.dispatchEvent(new CustomEvent('aid-guide-reading',{bubbles:true,detail:{kind,training:viewer.dataset.aidTraining === 'true',readingTarget:targetId,targetId}}));
      const input = document.getElementById(targetId);
      input?.scrollIntoView({block:'center',behavior:'auto'});
      input?.focus({preventScroll:true});
      return;
    }
    if (action === 'motion') {
      if (emergencyGuideReducedMotion()) return;
      paused = !paused;
      viewer.classList.toggle('is-paused', paused);
      emergencyGuideSetMotionStatus(viewer,paused ? 'paused' : 'playing');
      return;
    }
    if (action === 'replay') {
      if (emergencyGuideReducedMotion()) return;
      emergencyGuideRestoreOverview(viewer);
      viewer.querySelector('.aid-guide-picture').classList.remove('is-still');
      viewer.classList.remove('is-paused');
      const [title,,,scene] = emergencyGuideContent[kind].steps[index];
      viewer.querySelector('.aid-guide-illustration').outerHTML = emergencyGuideScene(scene,title);
      const timeline = viewer.querySelector('.aid-guide-timeline');
      if (timeline) timeline.outerHTML = emergencyGuideTimeline(scene);
      emergencyGuideSetMotionStatus(viewer,'playing');
      return;
    }
    if (action === 'next') index = Math.min(total - 1, index + 1);
    else if (action === 'previous') index = Math.max(0, index - 1);
    else if (action === 'restart') index = 0;
    else if (action === 'jump') index = Math.max(0,Math.min(total-1,Number(button.dataset.aidGuideTarget)||0));
    else return;
    emergencyGuideStopSpeech();
    viewer.dataset.aidGuideStep = String(index);
    viewer.innerHTML = emergencyGuideInner(kind,index,paused,{training:viewer.dataset.aidTraining === 'true'});
    const focusSelector = action === 'jump' ? `[data-aid-guide-target="${index}"]` : `[data-aid-guide-action="${action === 'previous' && index > 0 ? 'previous' : index === total - 1 ? (kind === 'measure' ? 'reading' : 'restart') : 'next'}"]`;
    viewer.querySelector(focusSelector)?.focus({preventScroll:true});
    viewer.querySelector('.aid-guide-stage')?.scrollIntoView({block:'start',behavior:'auto'});
  });
}
