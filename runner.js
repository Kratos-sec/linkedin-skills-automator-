/**
 * LinkedIn Skill Automation Engine (DevTools Console Runner)
 * Repository: linkedin-skills-automator
 */
(function initLinkedInSkillAutomator() {
    if (document.getElementById('li-skill-hud')) {
        document.getElementById('li-skill-hud').remove();
    }

    const CONFIG = {
        POLL_INTERVAL_MS: 150,
        TIMEOUT_MS: 12000,
        BASE_ACTION_DELAY_MS: 1200,
        JITTER_MS: 600,
        STORAGE_KEY: 'LI_SKILL_AUTO_PROGRESS'
    };

    const sleep = (ms) => new Promise(res => setTimeout(res, ms + Math.random() * CONFIG.JITTER_MS));

    // -------------------------------------------------------------
    // UI HUD INJECTION
    // -------------------------------------------------------------
    const hud = document.createElement('div');
    hud.id = 'li-skill-hud';
    hud.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        width: 320px;
        padding: 16px;
        background: #1b1f23;
        color: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
    `;

    hud.innerHTML = `
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>LinkedIn Skill Automator</span>
            <span id="hud-status" style="font-size: 11px; color: #a0aec0;">Ready</span>
        </div>
        <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 4px; font-size: 11px; color: #cbd5e0;">Load skills.json:</label>
            <input type="file" id="hud-file-input" accept=".json" style="width: 100%; font-size: 12px; color: #cbd5e0;" />
        </div>
        <div style="margin-bottom: 10px; display: flex; gap: 8px;">
            <button id="hud-start-btn" disabled style="flex: 1; padding: 6px; background: #0a66c2; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">Start</button>
            <button id="hud-pause-btn" disabled style="padding: 6px 12px; background: #4a5568; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Pause</button>
            <button id="hud-reset-btn" style="padding: 6px 12px; background: #e53e3e; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Reset</button>
        </div>
        <div id="hud-log" style="height: 70px; overflow-y: auto; background: #0d1117; padding: 6px; border-radius: 4px; font-family: monospace; font-size: 11px; color: #58a6ff;">Waiting for skills.json...</div>
    `;
    document.body.appendChild(hud);

    const logEl = document.getElementById('hud-log');
    const statusEl = document.getElementById('hud-status');
    const fileInput = document.getElementById('hud-file-input');
    const startBtn = document.getElementById('hud-start-btn');
    const pauseBtn = document.getElementById('hud-pause-btn');
    const resetBtn = document.getElementById('hud-reset-btn');

    function log(msg) {
        logEl.innerHTML += `<div>${msg}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
        console.log(`[SkillAuto] ${msg}`); }  let loadedSkills = []; let isPaused = false; let isRunning = false;  fileInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return;  const reader = new FileReader(); reader.onload = (event) => { try { loadedSkills = JSON.parse(event.target.result); if (!Array.isArray(loadedSkills)) throw new Error('Root JSON must be an array of objects.'); log(`Loaded ${loadedSkills.length} skills successfully.`);
                startBtn.disabled = false;
                statusEl.innerText = `${loadedSkills.length} skills`;
            } catch (err) {
                log(`Invalid JSON: ${err.message}`);
            }
        };
        reader.readAsText(file);
    });

    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.innerText = isPaused ? 'Resume' : 'Pause';
        statusEl.innerText = isPaused ? 'Paused' : 'Running';
    });

    resetBtn.addEventListener('click', () => {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        log('Saved run index reset to 0.');
    });

    startBtn.addEventListener('click', async () => {
        if (isRunning) return;
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        fileInput.disabled = true;
        statusEl.innerText = 'Running';
        await runBatch(loadedSkills);
    });

    // -------------------------------------------------------------
    // AUTOMATION CORE
    // -------------------------------------------------------------
    async function waitFor(predicateFn, description, timeoutMs = CONFIG.TIMEOUT_MS) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const res = predicateFn();
                if (res) return res;
            } catch (e) {}
            await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL_MS));
        }
        throw new Error(`Timeout waiting for: ${description}`);
    }

    function findButtonByText(regex) {
        return Array.from(document.querySelectorAll('button')).find(b => regex.test(b.innerText.trim()) && !b.disabled);
    }

    async function setComboboxValue(inputEl, value) {
        inputEl.focus();
        await sleep(150);

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(inputEl, '');
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));

        const execSuccess = document.execCommand('insertText', false, value);
        if (!execSuccess || inputEl.value !== value) {
            nativeSetter.call(inputEl, value);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }

        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        inputEl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Down', code: 'ArrowDown' }));
    }

    async function openModalIfClosed() {
        const input = document.querySelector('input[aria-label^="Skill"], input[placeholder*="Skill"]');
        if (input) return;

        const addBtn = document.querySelector('a[href*="/skills/edit/forms/new/"], button[aria-label="Add a skill"], a[aria-label="Add a skill"]');
        if (addBtn) {
            addBtn.click();
            await waitFor(() => document.querySelector('input[aria-label^="Skill"], input[placeholder*="Skill"]'), 'Add Skill modal');
            await sleep(CONFIG.BASE_ACTION_DELAY_MS);
        } else {
            throw new Error('Could not find "Add skill" entry button.');
        }
    }

    async function handleTypeaheadSelection(skillName) {
        const input = await waitFor(
            () => document.querySelector('input[aria-label^="Skill"], input[placeholder*="Skill"]'),
            'Skill Input Box'
        );

        await setComboboxValue(input, skillName);
        await sleep(900);

        const suggestion = await waitFor(() => {
            const options = Array.from(document.querySelectorAll('[role="listbox"] [role="option"], .basic-typeahead__selectable-list li, div[data-view-name*="typeahead"] div'));
            if (!options.length) return null;
            return options.find(el => el.innerText.toLowerCase().includes(skillName.toLowerCase())) || options[0];
        }, `Dropdown for "${skillName}"`);  suggestion.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); suggestion.click(); await sleep(CONFIG.BASE_ACTION_DELAY_MS); }  async function mapCheckboxes(targets) { await waitFor(() => { const boxes = document.querySelectorAll('input[type="checkbox"]'); return boxes.length > 10; }, 'Checkboxes mount (~97 items)');  await sleep(500);  const rows = Array.from(document.querySelectorAll('input[type="checkbox"]')).map(cb => { const container = cb.closest('li') \vert{}\vert{} cb.parentElement?.parentElement?.parentElement; return { checkbox: cb, text: container ? container.innerText.trim().toLowerCase() : '' }; });  let matched = 0; for (const target of targets) { const cleanTarget = target.trim().toLowerCase(); const match = rows.find(r => r.text.includes(cleanTarget));  if (match) { if (!match.checkbox.checked) { match.checkbox.click(); match.checkbox.dispatchEvent(new Event('change', { bubbles: true })); matched++; await sleep(150); } } else { log(`[Miss] Target "${target}"`);
            }
        }
        log(`Mapped ${matched}/${targets.length} targets`);
    }

    async function saveAndChainNext(isLastItem) {
        const saveBtn = await waitFor(() => findButtonByText(/^Save$/i), 'Save button');
        saveBtn.click();
        await sleep(CONFIG.BASE_ACTION_DELAY_MS);

        if (isLastItem) return;

        const addMoreBtn = await waitFor(
            () => findButtonByText(/Add more skills/i),
            '"Add more skills" button',
            8000
        ).catch(() => null);

        if (addMoreBtn) {
            addMoreBtn.click();
            await waitFor(() => document.querySelector('input[aria-label^="Skill"], input[placeholder*="Skill"]'), 'Next input');
            await sleep(CONFIG.BASE_ACTION_DELAY_MS);
        } else {
            await openModalIfClosed();
        }
    }

    async function runBatch(skills) {
        let startIndex = parseInt(localStorage.getItem(CONFIG.STORAGE_KEY) || '0', 10);
        await openModalIfClosed();

        for (let i = startIndex; i < skills.length; i++) {
            while (isPaused) {
                await sleep(500);
            }

            const item = skills[i];
            log(`[${i + 1}/${skills.length}] Adding: ${item.name}`);  try { await handleTypeaheadSelection(item.name); await mapCheckboxes(item.targets \vert{}\vert{} []); await saveAndChainNext(i === skills.length - 1); localStorage.setItem(CONFIG.STORAGE_KEY, (i + 1).toString()); await sleep(1000); } catch (err) { log(`Error: ${err.message}`);
                await sleep(5000);
                await openModalIfClosed().catch(() => {});
            }
        }

        statusEl.innerText = 'Completed';
        log('All skills processed.');
        localStorage.removeItem(CONFIG.STORAGE_KEY);
    }
})();
