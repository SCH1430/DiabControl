function ingredientValues(strict = true) {
  return [...$('ingredientRows').children].map((row) => {
    const get = (k) => row.querySelector('[data-ingredient="' + k + '"]').value;
    const i = {
      name: get('name').trim(),
      weight: strict ? number(get('weight'), 'Вес ингредиента', 0.1, 100000) : get('weight'),
      carbsPer100: strict ? number(get('carbsPer100'), 'Углеводы ингредиента', 0, 100) : get('carbsPer100'),
      source: get('source'),
    };
    if (strict && !i.name) throw new Error('Укажите названия всех ингредиентов.');
    return i;
  });
}
function addIngredient(item = { name: '', weight: '', carbsPer100: '', source: 'manual' }) {
  if ($('ingredientRows').children.length >= 30) {
    notice('Можно добавить до 30 ингредиентов.', true);
    return;
  }
  const row = document.createElement('fieldset');
  row.className = 'ingredient-row';
  row.innerHTML = `<legend>Ингредиент</legend><label>Название<input data-ingredient="name" maxlength="200" value="${esc(item.name)}" /></label><div class="two-cols"><label>Вес, г<input type="number" data-ingredient="weight" min="0.1" max="100000" step="any" inputmode="decimal" value="${esc(item.weight)}" /></label><label>Углеводы на 100 г<input type="number" data-ingredient="carbsPer100" min="0" max="100" step="any" inputmode="decimal" value="${esc(item.carbsPer100)}" /></label></div><label>Источник<select data-ingredient="source"><option value="manual">Введено вручную</option><option value="label">С упаковки</option></select></label><button type="button" class="text-btn" data-remove-ingredient>Убрать ингредиент</button>`;
  row.querySelector('select').value = item.source;
  $('ingredientRows').append(row);
}
function toggleRecipe(addFirst = true) {
  const on = $('recipeMode').checked;
  $('recipePanel').classList.toggle('hidden', !on);
  $('foodCarbsPer100').readOnly = on;
  $('foodSource').disabled = on;
  if (on) {
    $('foodSource').value = 'recipe';
    if (addFirst && !$('ingredientRows').children.length) addIngredient();
  } else if ($('foodSource').value === 'recipe') $('foodSource').value = 'manual';
  for (const el of $('recipePanel').querySelectorAll('input,select,button')) el.disabled = !on;
  if (on) recalculateRecipe();
}
function recalculateRecipe(strict = false) {
  if (!$('recipeMode').checked) return;
  try {
    const ingredients = ingredientValues();
    if (!ingredients.length) throw new Error('Добавьте ингредиент.');
    const yieldWeight = number($('recipeYield').value, 'Вес готового блюда', 0.1, 100000),
      total = ingredients.reduce((sum, i) => sum + (i.weight * i.carbsPer100) / 100, 0),
      per100 = (total / yieldWeight) * 100;
    number(per100, 'Углеводы в готовом блюде на 100 г', 0, 100);
    $('foodCarbsPer100').value = String(per100);
    $('recipeResult').textContent =
      `Всё блюдо: ${fmt(yieldWeight)} г, ${fmt(total)} г углеводов. На 100 г: ${fmt(per100)} г.`;
  } catch (e) {
    $('foodCarbsPer100').value = '';
    $('recipeResult').textContent = e.message;
    if (strict) throw e;
  }
}
function readPortions() {
  const raw = $('foodPortions').value.trim();
  if (!raw) return [];
  const result = [
    ...new Set(raw.split(';').map((v) => number(v.trim().replace(',', '.'), 'Порция', 0.1, 100000))),
  ];
  if (result.length > 12) throw new Error('Сохраните не более 12 порций.');
  return result;
}
function renderPortions() {
  let sizes = [];
  try {
    sizes = readPortions();
  } catch {}
  $('portionChoices').innerHTML = sizes
    .map((w) => `<button type="button" class="secondary" data-portion="${w}">${fmt(w)} г</button>`)
    .join('');
}
function fillFoodExtras(item) {
  $('foodSource').value = item.source || 'unknown';
  $('foodPortions').value = (item.portions || []).join('; ');
  $('recipeMode').checked = !!item.ingredients?.length;
  $('ingredientRows').innerHTML = '';
  (item.ingredients || []).forEach((i) => addIngredient(i));
  $('recipeYield').value = item.recipeYield ?? '';
  toggleRecipe(false);
  renderPortions();
}
