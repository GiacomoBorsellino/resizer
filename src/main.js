let { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
let os = require("os");
let path = require("path");
let fs = require("fs");
let resizeImg = require("resize-img");

let isMac = process.platform === "darwin";
let isWin = process.platform === "win32";

// Controllo modalità applicazione: Sviluppo o Produzione
let isDevMod = process.env.NODE_ENV !== "production";

let mainWindow;

// Crea finestra principale
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "Image Resizer",
    width: isDevMod ? 800 : 500,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, "./renderer/js/preload.js"),
    },
    icon: path.join(__dirname, "./renderer/images/logo.png"),
  });

  mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));

  // Apre i devtools se siamo in modalità development e non i nproduzione
  if (isDevMod) {
    mainWindow.webContents.openDevTools();
  }
}

// Crea seconda finestra
function createAboutWindow() {
  let aboutWindow = new BrowserWindow({
    title: "About Image Resizer",
    width: isDevMod ? 800 : 500,
    height: 600,
    icon: path.join(__dirname, "./renderer/images/logo.png"),
  });

  aboutWindow.loadFile(path.join(__dirname, "./renderer/about.html"));

  // Apre i devtools se siamo in modalità development e non i nproduzione
  if (isDevMod) {
    aboutWindow.webContents.openDevTools();
  }
}

// Quando l'app è pronta ad avviarsi
app
  .whenReady()
  .then(() => {
    createMainWindow();

    // Implementa il menu custom
    let mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    // Rimuovi MainWindow dalla memoria alla chiusura
    mainWindow.on("closed", () => {
      mainMenu = null;
    });

    // Controllo se non ci sono finestre, la window principale verrà renderizzata
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows.length === 0) {
        createMainWindow();
      }
    });
  })
  .catch((error) => {
    console.log("Error: ", error);
  });

// Menu template
let menu = [
  // Controllo se l'app è su windows o MacOS
  // ...(isWin ? [{ label: app.name, submenu: "About" }] : []),
  {
    label: "File",
    submenu: [
      {
        label: "Exit",
        role: "Quit",
      },
    ],
  },
  {
    label: "About",
    click: () => {
      createAboutWindow();
    },
  },
];

// Risposta a ipcRenderer
ipcMain.on("image:resize", (e, options) => {
  console.log(options);
  options.dest = path.join(os.homedir(), "imageresizer");
  resizeImage(options);
});

// Funzione per resizare l'immagine
async function resizeImage({ imgPath, width, height, dest }) {
  try {
    let newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height,
    });

    let fileName = path.basename(imgPath);

    // Crea cartella di destinazione se non esiste
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    // Scrivi il file nella destinazione
    fs.writeFileSync(path.join(dest, fileName), newPath);

    // Return messaggio di successo
    mainWindow.webContents.send("image:done");

    // Apri cartellaq di destinazione
    shell.openPath(dest);
  } catch (error) {}
}

// Controllo per Mac, se tutte le finestre sono chiuse l'applicazione verrà spenta solo se non si è su Mac (win o linux)
app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});

// let menu = [
//   {
//     label: "File",
//     submenu: [
//       {
//         label: "Quit",
//         click: () => {
//           app.quit();
//         },
//         Accelerator: "CmdOrCtrl+W",
//       },
//     ],
//   },
// ];
