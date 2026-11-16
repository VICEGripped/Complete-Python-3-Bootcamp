# 🧪 Recipe Lab

Type a craving ("buffalo chicken mac n cheese", "Big Mac bowl") and get a healthy, budget-friendly, beginner-proof recipe. Save the ones you like, rate them, add notes, and build a combined grocery list.

---

## Setup (one time, about 10 minutes)

### Step 1: Install Node.js
Node.js is the free program that runs the app on your computer.

1. Go to **https://nodejs.org** and download the **LTS** version.
2. Open the installer and click through with the default options.
3. To check that it worked, open a terminal:
   - **Mac:** press `Cmd + Space`, type `Terminal`, press Enter.
   - **Windows:** press the Windows key, type `PowerShell`, press Enter.
4. Type `node --version` and press Enter. You should see something like `v24.x.x`. Any version 20.12 or newer works.

### Step 2: Get your Claude API key
1. Go to **https://platform.claude.com** and sign up or log in. (This is the developer Console. It's a separate account from a regular Claude.ai chat subscription.)
2. Open **Billing** and add a small amount of credit. $5 is plenty to start. Each recipe costs a few cents.
3. Open **API Keys**, click **Create Key**, name it `Recipe Lab`, and copy the key (it starts with `sk-ant-`).
   ⚠️ The Console only shows the key once, so paste it somewhere safe right away. Treat it like a password and never share it or post it online.

### Step 3: Get the app folder onto your computer
Download this repo from GitHub: open the **branch** page, click **Code → Download ZIP**, and unzip it. The app is in the `recipe-lab` folder.

### Step 4: Add your key in a `.env` file
1. In the `recipe-lab` folder, find the file named `.env.example`.
2. Make a copy of it and name the copy exactly **`.env`**, with nothing before the dot.
   - On a Mac, Finder hides files that start with a dot. Press `Cmd + Shift + .` to show them.
   - On Windows, make sure the name doesn't end up as `.env.txt`. Turn on **View → File name extensions** to check.
3. Open `.env` in a text editor (TextEdit or Notepad) and replace `paste-your-key-here` with your key:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxx...
   ```
   Don't put spaces or quotes around the key. Save the file.

### Step 5: Install and start the app
In your terminal, go into the folder. The easiest way is to type `cd ` (with a space after it) and then drag the `recipe-lab` folder into the terminal window. Press Enter, then run:

```
npm install
npm start
```

You only need `npm install` the first time. When you see **"Recipe Lab is running!"**, open **http://localhost:3000** in your browser.

To stop the app, click the terminal and press `Ctrl + C`. To use it again later, `cd` into the folder and run `npm start`.

---

## Using it on your phone
While the app is running on your computer, a phone on the **same Wi-Fi** can use it:

1. Find your computer's local IP address.
   - **Mac:** System Settings → Wi-Fi → Details → IP address
   - **Windows:** run `ipconfig` and look for "IPv4 Address"
2. On your phone, open `http://THAT-IP:3000` (for example `http://192.168.1.23:3000`).
3. Optional: use **Share → Add to Home Screen** so it opens like an app.

Saved recipes are stored in **each browser separately**. Recipes saved on your phone stay on your phone. Anyone on your Wi-Fi who opens that address can also make recipes, and those recipes use your API credit.

---

## Features
- **Create:** type an idea and tap **Cook it up**. The recipe usually takes 30 to 90 seconds.
- **Every recipe includes:** a hype description, total and active time, difficulty, cost per serving, separate ingredient sections for every sauce, seasoning, side, and topping, beginner steps with "done when" cues and mistakes to avoid, air fryer directions with an oven alternative, meal prep and reheating notes, flavor upgrades, and a 🎒 **Gig day friendly** flag.
- **No seafood, ever:** this includes fish sauce, oyster sauce, and Worcestershire. Recipes swap in a written-out substitute instead.
- **No calories or macros** are shown.
- **My Recipes:** search by name, ingredient, or note. Filter by style, rating, or gig-day friendly, and sort. Tap a recipe to rate it from 1 to 5 stars and add notes. Tap the same star again to clear the rating.
- **Grocery list:** tick recipes in My Recipes and tap **Make grocery list**. Matching ingredients are combined (1.5 lb + 1.5 lb of chicken becomes 3 lb) and grouped by store section. Tap items to check them off. You can also hide pantry staples or copy the list into your notes app.
- **Dark mode** is on by default. Tap ☀️/🌙 in the top corner to switch.

## Customizing
Your cooking profile (tastes, budget, equipment, no-seafood rule) is in **`recipe-prompt.js`** under `SYSTEM_PROMPT`. Edit it in any text editor, then restart the app (`Ctrl + C`, then `npm start`).

## Troubleshooting
| Problem | Fix |
|---|---|
| "No API key found" when starting | The `.env` file is missing or misnamed. See Step 4. |
| "Your API key was rejected" | The key was copied wrong. Paste it again into `.env` and restart. |
| "out of credits" or "Too many requests" | Add credit in the Console under Billing, or wait a minute. |
| "Couldn't reach the Recipe Lab server" | The terminal running `npm start` was closed. Start it again. |
| `npm: command not found` | Node.js isn't installed. Do Step 1, then close and reopen the terminal. |

## Files
- `server.js`: small local server that talks to Claude. Your key stays here and is never sent to the browser.
- `recipe-prompt.js`: your cooking profile and the recipe format Claude fills in.
- `public/`: the web page (`index.html`, `styles.css`, `app.js`).
