# LinkedIn Skill & Experience Automator

Automates adding skills to a LinkedIn profile and mapping them to corresponding Experience, Education, Certification, and Project checkboxes using the browser DevTools console.

## Project Structure

```
├── .gitignore
├── README.md
├── skills.sample.json   # Template skill mappings
└── runner.js            # In-page DevTools console script with HUD loader
```

## Setup & Usage

1. Copy `skills.sample.json` to `skills.json` and configure your skills and target titles:
   ```json
   [
     {
       "name": "Threat Modeling",
       "targets": ["Assets, Threats, and Vulnerabilities", "Ethical Hacking Capstone"]
     }
   ]
   ```
2. Navigate to your LinkedIn profile skills view in Chrome:
   ```
   [https://www.linkedin.com/in/](https://www.linkedin.com/in/)<your-profile-slug>/details/skills/
   ```
3. Open Chrome DevTools (`F12` or `Cmd + Option + I`) and switch to the **Console** tab.
4. Copy the entire contents of `runner.js` and paste it into the console, then hit **Enter**.
5. A floating panel titled **LinkedIn Skill Automator** will appear in the top-right corner:
   - Click **Choose File** and select your local `skills.json`.
   - Click **Start**.
6. The script handles typeahead matching, waits for the ~97 item checkbox container to mount, ticks each matching target, clicks **Save**, and chains via **Add more skills**.

## Features

- **Decoupled Data:** Skills are supplied via `skills.json` using the local HTML5 File API (no local web server or CORS configurations required).
- **React 18 State Bypassing:** Uses native property descriptors and synthetic event dispatching to populate comboboxes and trigger dropdown options.
- **Auto-Resume & State Persistence:** Tracks processed indexes in `localStorage`. If interrupted, running the script again resumes where it left off.
- **In-Page Controls:** Live log output with **Pause/Resume** and **Reset** buttons directly on the page.# linkedin-skills-automator-
