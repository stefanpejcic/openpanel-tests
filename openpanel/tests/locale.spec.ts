import { test, expect } from '@playwright/test';


test('change locale', async ({ page }) => {
  navigate to /account/language

  in select id="locale-select" select values one by one:
<select class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" id="locale-select" aria-label="Select Language">
                                            <option selected="" disabled="">Choose Language</option>
                                            <option value="en">en </option><option value="ru">ru </option><option value="hu">hu </option><option value="ne">ne </option><option value="es">es </option><option value="bg">bg </option><option value="tr">tr </option><option value="fr">fr </option><option value="zh">zh </option><option value="ro">ro </option><option value="pt">pt </option><option value="de">de </option><option value="uk">uk </option>
                                        </select>

  after each we should dispaly the page in that lcoale,a nd e use one text form it to verufy, if you cna for each locale, get their file from https://github.com/stefanpejcic/openpanel-translations/tree/main using github api and look if we have that tet to consider trnalsation working!
  
  console.log(`${locale is working: {text}`);

  
});
