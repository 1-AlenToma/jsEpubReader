function ReactNativeApi() {
    const requestedData = new Map();

    function get(type) {
        let data = undefined;
        if (requestedData.has(type)) {
            data = requestedData.get(type);
            requestedData.delete(type);
        }
        return data;
    }

    async function postMessage(msg, args) {
        try {
            await window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: msg, data: args })
            );
        } catch (e) {
            postMessage("ERROR", e.toString());
        }
    }

    async function sleep(ms) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, ms || 500);
        });
    }

    document.addEventListener(
        "message",
        function (event) {
            try {
                var data = JSON.parse(event.data);
                switch (data.type) {
                    case "NovelData":
                        window.novel = data.data;
                        renderEbookReader();
                        break;
                    case "Play":
                        if (!window.book || window.book.menu.player.playing)
                            return;
                        window.book.play(data);
                        break;
                    case "Pause":
                        if (!window.book || !window.book.menu.player.playing)
                            return;
                        window.book.stop();
                        break;
                    case "PlayNext":
                        if (!window.book) return;
                        window.selectedChapter.next();
                        break;
                    case "PlayPrev":
                        if (!window.book) return;
                        window.book.selectedChapter.prev();
                        break;
                    default:
                        postMessage("LOG", data);
                }
            } catch (e) {
                postMessage("ERROR", e.toString());
            }
        },
        false
    );

    async function renderEbookReader() {
        try {
            if (!window.novel) {
                postMessage("NovelData");
                return;
            }
            Object.keys(novel.files).forEach(x => {
                let item = novel.files[x];
                item.async = async ch => {
                    await postMessage("onChapterRequest", ch);
                    while (!requestedData.has("RequestedChapter"))
                        await sleep(100);
                    return get("RequestedChapter");
                };
            });

            await postMessage("LOG", "Loading Novel" + novel.name);
            externalContainer = document.getElementById("container");
            window.book = new Book(
                externalContainer,
                {
                    ...novel.options,
                    onBack: () => {
                        postMessage("BACK", "");
                    },
                    api: {
                        speak: async txt => {
                            await postMessage("SPEEK", txt);
                        },
                        pause: async () => {
                            await postMessage("STOP", "");
                        }
                    },
                    onSettingUpdate: async () => {
                        await postMessage("SETTINGS", book.settings);
                    },
                    onChapterUpdate: async () => {
                        await postMessage("CHAPTER", book.selectedChapter);
                    }
                },
                novel.files,
                novel
            );
            await book.load();
            postMessage("LOG", "NovelLoaded");
        } catch (e) {
            postMessage("ERROR", e.toString());
        }
    }

    renderEbookReader();
}

class VoiceSettings {
    constructor(book) {
        this.voices = book.options.voices;
        this.r = book.settings.rate || 1;
        this.p = book.settings.pitch || 1;
        this.v = book.settings.voice;
        this.lang = book.settings.lang || "en";
        this.text = "";
        this.api = book.options.api;
        this.book = book;
        console.log(this);
    }

    get voice() {
        return this.v;
    }

    set voice(v) {
        this.v = v;
        this.book.settings.voice = v;
    }

    get pitch() {
        return this.p;
    }

    set pitch(p) {
        this.p = p;
        this.book.settings.pitch = p;
    }

    get rate() {
        return this.r;
    }

    set rate(r) {
        this.r = r;
        this.book.settings.rate = r;
    }

    speak(text) {
        this.text = text;
        if (this.api && this.api.speak) {
            this.api.speak(text);
        }
    }

    pause() {
        if (this.api && this.api.pause) {
            this.api.pause();
        }
    }
}

function contextMenu(w, book) {
    if (document.querySelector("context"))
        document.querySelector("context").remove();
    this.xmenu = new Element("context", {
        className: "hidden"
    }).appendTo(document.body);
    let sc = document.querySelector("#epubContainer");
    let menu = this.xmenu.el;
    this.menuState = 0;
    let copy = new Element("item", {
        innerHTML: `<span class="material-symbols-outlined">content_copy</span>Copy`
    }).appendTo(this.xmenu);
    let replace = new Element("item", {
        innerHTML: `<span class="material-symbols-outlined">regular_expression</span>Replace`
    }).appendTo(this.xmenu);
    let translate = new Element("item", {
        innerHTML: `<span class="material-symbols-outlined">g_translate</span>Translate`
    }).appendTo(this.xmenu);

    replace.event("click", () => {
        toggleMenuOff();
        new textReplacement(getSelectionText());
        if (book.options.onContextMenu) {
            book.options.onContextMenu("replace", getSelectionText());
        }
    });

    translate.event("click", () => {
        toggleMenuOff();
        if (book.options.onContextMenu) {
            book.options.onContextMenu("translate", getSelectionText());
        }
    });

    copy.event("click", () => {
        let text = getSelectionText();
        navigator.clipboard.writeText(text);
        toggleMenuOff();
        if (book.options.onContextMenu) book.options.onContextMenu("copy");
    });

    w.document.oncontextmenu = function (event) {
        event.preventDefault();
        toggleMenuOn();
        positionMenu(event);
    };

    w.document.onclick = e => {
        var button = e.which || e.button;
        if (button === 1) {
            toggleMenuOff();
        }
    };

    // Close Context Menu on Esc key press
    w.onkeyup = function (e) {
        if (e.keyCode === 27) {
            e.preventDefault();
            e.stopPropagation();
            toggleMenuOff();
        }
    };

    const toggleMenuOn = () => {
        if (this.menuState !== 1) {
            this.menuState = 1;
            this.xmenu.show();
        }
    };

    // Turns the custom context menu off.
    const toggleMenuOff = () => {
        if (this.menuState !== 0) {
            this.menuState = 0;
            this.xmenu.hide();
        }
    };

    function getSelectionText() {
        var text = "";
        if (w.getSelection) {
            text = w.getSelection().toString();
        } else if (
            w.document.selection &&
            w.document.selection.type != "Control"
        ) {
            text = w.document.selection.createRange().text;
        }
        return text;
    }

    function positionMenu(e) {
        let clickCoords = getPosition(e);
        let clickCoordsX = clickCoords.x;
        let clickCoordsY = clickCoords.y;
        let menuWidth = menu.offsetWidth + 4;
        let menuHeight = menu.offsetHeight + 4;

        let windowWidth = w.innerWidth;
        let windowHeight = w.innerHeight;

        if (
            windowWidth - clickCoordsX < menuWidth &&
            windowWidth - menuWidth > 0
        ) {
            menu.style.left = windowWidth - menuWidth + "px";
        } else {
            menu.style.left = clickCoordsX + "px";
        }

        if (windowHeight - clickCoordsY < menuHeight) {
            menu.style.top = windowHeight - menuHeight + "px";
        } else {
            menu.style.top = clickCoordsY + "px";
        }
    }

    function getPosition(e) {
        sc = document.querySelector("#epubContainer");

        var posx = 0;
        var posy = 0;

        if (!e) var e = window.event;
        let py = (e.pageY || e.clientY) - sc.scrollTop;
        let px = (e.pageX || e.clientX) - sc.scrollLeft;
        let offset = getOffet(sc);
        py -= offset.y;
        py += book.getPadding();
        px += offset.x;
        return {
            x: px,
            y: py
        };
    }
}

customElements.define(
    "svg-progress-circle",
    class extends HTMLElement {
        connectedCallback() {
            let d = "M5,30a25,25,0,1,1,50,0a25,25,0,1,1,-50,0"; // circle
            this.innerHTML = `<svg viewBox="0 0 60 60">
    <path stroke-dasharray="10 2"   stroke-dashoffset="-19"
    pathlength="120" d="${d}" fill="#ccc" stroke="lightgrey" stroke-width="5"/>
    <path stroke-dasharray="30 70" stroke-dashoffset="-25"
    pathlength="100" d="${d}" fill="none"
    stroke="${this.getAttribute("color") || "red"}" stroke-width="5"/>
    <text x="50%" y="57%" text-anchor="middle">30%</text></svg>`;
            this.style.display = "inline-block";
            this.percent = this.getAttribute("percent");
        }
        set percent(val = 0) {
            val = val || 0;
            this.setAttribute("percent", val);
            let dash = (val || 0) + " " + (100 - val);
            this.querySelector("path+path").setAttribute(
                "stroke-dasharray",
                dash
            );
            this.querySelector("text").innerHTML = val.toFixed(0) + "%";
        }
    }
);

function openFullscreen() {
    try {
        const elem = document.body;
        const elem0 = document;
        var isfullscren =
            (elem0.fullscreenElement && elem0.fullscreenElement !== null) ||
            (elem0.webkitFullscreenElement &&
                elem0.webkitFullscreenElement !== null) ||
            (elem0.mozFullScreenElement &&
                elem0.mozFullScreenElement !== null) ||
            (elem0.msFullscreenElement && elem0.msFullscreenElement !== null);

        if (!isfullscren) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                /* Safari */
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                /* IE11 */
                elem.msRequestFullscreen();
            }
        } else {
            if (elem0.exitFullscreen) {
                elem0.exitFullscreen();
            } else if (elem0.webkitExitFullscreen) {
                elem0.webkitExitFullscreen();
            } else if (elem0.mozCancelFullScreen) {
                elem0.mozCancelFullScreen();
            } else if (elem0.msExitFullscreen) {
                elem0.msExitFullscreen();
            }
        }
    } catch (e) {
        console.error(e);
    }
}

function touchable(whileTouched, options) {
    options = options || {};
    const el = new Element("a", {
        ...options,
        ontouchstart: () => {
            whileTouched();
            clearInterval(el.touchtimer);
            el.touchtimer = setInterval(() => {
                whileTouched();
            }, 400);
        },
        ontouchend: () => clearInterval(el.touchtimer)
    });

    return el;
}
const getOffet = div => {
    div = div.el || div;
    const item = div.getBoundingClientRect();
    item.right = item.width + item.x;
    item.bottom = item.y + item.height;
    return item;
};

function getScrollableEl(div) {
    let el = div;
    for (let i = 0; i < 2; i++) {
        el = el.parentNode;
        if (el === undefined) return div;
        const hasVerticalScrollbar = el.scrollHeight > el.clientHeight;
        if (hasVerticalScrollbar) return el;
    }
    return div;
}

function scrollTo(el, parent) {
    try {
        el = typeof el === "string" ? document.querySelector(el) : el;

        parent = parent || el.parentNode;
        const offset = el.offsetTop;
        if (offset === undefined) return;
        parent.scrollTo(0, offset);
    } catch (e) {
        console.error("hhhh", e);
    }
}

const arrayItem = function (titems) {
    const arr = function () {};
    arr.prototype = Array.prototype;

    arr.prototype.add = function (...items) {
        for (let item of items) this.push(item);
        return this;
    };

    arr.prototype.removeAt = function (index) {
        const item = [index];
        this.splice(index, 1);
        if (item.appendChild) item.remove();
        return this;
    };

    arr.prototype.remove = function (item) {
        const index = this.findIndex(x => x === item);
        return this.removeAt(item);
    };

    arr.prototype.clear = function () {
        while (this.length > 0) {
            let item = this.shift();
            if (item.appendChild) item.remove();
        }
        return this;
    };

    item = new arr();
    item.add.bind(item);
    item.remove.bind(item);
    item.clear.bind(item);
    item.removeAt.bind(item);
    if (titems) item.add(...titems);
    return item;
};

const createdElements = new arrayItem();
const Element = function (type, options) {
    this.el = typeof type === "string" ? document.createElement(type) : type;
    if (typeof type === "string") createdElements.add(this.el);
    if (options)
        Object.keys(options).forEach(x => {
            if (this.el.style[x] !== undefined) this.el.style[x] = options[x];
            else this.el[x] = options[x];
        });
    this.counter = 10;
    this.val = value => {
        const isv =
            ["input", "textarea"].indexOf(this.el.tagName.toLowerCase()) !== -1;
        if (value != undefined) {
            if (!isv) this.el.innerHTML = value;
            else this.el.value = value;
        }

        if (isv) return this.el.value;
        return this.el.innerHTML;
    };

    this.event = (name, func) => {
        name.split(",").forEach(x => {
            this.el.addEventListener(x, func);
        });
        return this;
    };

    this.attr = (key, value) => {
        if (value !== undefined) this.el.setAttribute(key, value);
        return this.el.getAttribute(key);
    };

    this.setAttr = (key, value) => {
        this.attr(key, value);
        return this;
    };

    function getStyle(el, cssprop) {
        if (el.currentStyle)
            //IE
            return el.currentStyle[cssprop];
        else if (document.defaultView && document.defaultView.getComputedStyle)
            //Firefox
            return document.defaultView.getComputedStyle(el, "")[cssprop];
        //try and get inline style
        else return el.style[cssprop];
    }

    this.styleValue = (...items) => {
        let item = {};
        items.forEach(k => {
            item[k] = getStyle(this.el, k);
        });

        return item;
    };

    this.css = options => {
        Object.keys(options).forEach(x => {
            this.el.style[x] = options[x];
        });
        return this;
    };

    this.offset = () => {
        return getOffet(this.el);
    };

    this.getEl = item => {
        return item && item.el ? item.el : item;
    };

    this.appendTo = parent => {
        this.getEl(parent).appendChild(this.el);
        jscolor.install();
        return this;
    };

    this.add = (...contents) => {
        contents.forEach(content => {
            if (typeof content == "string") {
                const c = document.createElement("div");
                c.innerHTML = content;
                content = c;
            }

            if (content.el === undefined) this.el.appendChild(content);
            else this.el.appendChild(content.el);
        });
        jscolor.install();
        return this;
    };

    this.prepend = content => {
        if (typeof content == "string") {
            const c = document.createElement("div");
            c.innerHTML = content;
            content = c;
        }

        if (content.el === undefined) this.el.prepend(content);
        else this.el.prepend(content.el);
    };

    this.insertAfter = c => {
        c = c.el === undefined ? c : c.el;
        c.appendChild(this.el);
        c.parentNode.insertBefore(this.el, c.nextSibling);
        return this;
    };

    this.insertBefore = c => {
        c = c.el === undefined ? c : c.el;
        c.appendChild(this.el);
        c.parentNode.insertBefore(this.el, c.previousSibling);
        return this;
    };

    this.center = parent => {
        if (this.centerObject == undefined)
            this.centerObject = new center(this, parent);
        return this.centerObject;
    };

    this.classList = () => this.el.classList;

    this.slideDown = (center, offset, Onfinished) => {
        const firstrun = offset == undefined;
        if (firstrun) {
            this.classList().remove("hidden");
            if (center) this.center().focus().destroy();
            offset = offset || this.offset();
            this.css({
                top: "-" + (offset.y + offset.height) + "px",
                opacity: 1
            });
        }
        const coffset = this.offset();
        setTimeout(() => {
            if (coffset.y < offset.y) {
                this.css({
                    top: Math.min(coffset.y + this.counter, offset.y) + "px"
                });
                this.slideDown(center, offset, Onfinished);
            } else if (Onfinished) Onfinished();
        }, 0);
    };

    this.slideUp = (y, onfinished) => {
        const offset = this.offset();
        y = y || -(offset.y + offset.height);
        setTimeout(() => {
            if (offset.y > y) {
                y += this.counter;
                this.css({
                    top: offset.y - this.counter + "px"
                });
                this.slideUp(y, onfinished);
            } else {
                this.classList().add("hidden");
                if (onfinished) onfinished();
            }
        }, 0);
    };

    this.show = (ms, max, op) => {
        ms = ms || 1;
        max = max || 1;
        if (op === undefined) {
            this.css({
                opacity: 0
            });
            op = 0;
            this.classList().remove("hidden");
        }
        setTimeout(() => {
            op += 0.01;
            if (op <= max) {
                this.css({
                    opacity: op
                });
                this.show(ms, max, op);
            }
        }, ms);
    };

    this.hide = (ms, op) => {
        ms = ms || 1;
        op = op || parseFloat(this.styleValue("opacity").opacity);
        setTimeout(() => {
            op -= 0.01;
            if (op >= 0) {
                this.css({
                    opacity: op
                });
                this.hide(ms, op);
            } else this.classList().add("hidden");
        }, ms);
    };

    this.find = path => {
        return new Element(this.el.querySelector(path));
    };

    this.findAll = path => {
        return [...this.el.querySelectorAll(path)].map(x => new Element(x));
    };
};

const resizEvents = new arrayItem();
const center = function (el, parent, resize) {
    parent = parent || document.body;
    parent = parent.el || parent;
    el = el.el || el;
    resizEvents.add(() => {
        setTimeout(() => {
            this.focus();
        }, 300);
    });
    this.index = resizEvents.length - 1;
    this.focus = () => {
        const pOffset = getOffet(parent);
        const eOffset = getOffet(el);
        el.style.left =
            pOffset.x + pOffset.width / 2 - eOffset.width / 2 + "px";
        el.style.top =
            pOffset.y + pOffset.height / 2 - eOffset.height / 2 - 30 + "px";
        return this;
    };

    this.destroy = () => {
        resizEvents.removeAt(this.index);
    };
};

function SelectableButton(label, options, ...texts) {
    this.el = formField(label, {
        ...options,
        type: "button"
    });

    const btn = this.el.find("input");

    this.select = () => {
        btn.classList().add("selected");
        if (texts.length > 0) btn.val(texts[0]);

        return this;
    };

    this.toggle = () => {
        if (btn.classList().contains("selected")) this.deSelect();
        else this.select();

        return this;
    };

    this.deSelect = () => {
        btn.classList().remove("selected");
        if (texts.length > 1) btn.val(texts[1]);

        return this;
    };

    btn.event("click", () => {
        this.toggle();
    });
}

const wait = ms => {
    return new Promise(r => setTimeout(r, ms));
};

let dialogsTotal = 1;
const dialog = function (parent, onchange) {
    dialogsTotal++;
    parent = parent || book.epubBody;
    const blur = document.createElement("div");
    blur.className = "blur hidden";
    blur.style.zIndex = dialogsTotal * 100;
    parent.appendChild(blur);

    const dialog = new Element("div", {
        zIndex: dialogsTotal * 101,
        className: "dialog hidden"
    }).appendTo(parent);
    this.dialog = dialog;
    this.centerData = undefined;
    dialog.center(parent);
    this.center = new center(dialog, parent);
    this.size = () => {
        if (this.centerData) {
            this.centerData.style.height = dialog.offset().height - 40 + "px";
        }
    };

    blur.onclick = () => {
        this.close();
    };

    resizEvents.add(() => {
        this.size();
    });
    this.rindex = resizEvents.length - 1;
    this.timer = undefined;
    this.open = () => {
        blur.classList.remove("hidden");
        dialog.slideDown(true, undefined, () => {
            this.size();
            if (onchange) onchange();
            jscolor.install();
        });
        return this;
    };

    this.close = () => {
        dialog.slideUp(undefined, () => {
            blur.classList.add("hidden");
        });

        return this;
    };

    this.destroy = () => {
        dialog.el.remove();
        blur.remove();
        this.center.destroy();
        resizEvents.removeAt(this.rindex);
        dialogsTotal--;
    };

    this.title = (text, buttons) => {
        const tContainer = document.createElement("div");
        tContainer.className = "title";
        tContainer.innerHTML = text;
        dialog.prepend(tContainer);
        new Element("a", {
            innerHTML: "x",
            color: "red",
            onclick: () => {
                this.close();
            }
        }).appendTo(tContainer);
        return this;
    };

    this.data = content => {
        if (this.centerData === undefined) {
            this.centerData = document.createElement("div");
            this.centerData.className = "center";
            dialog.add(this.centerData);
        }
        this.centerData.innerHTML = "";
        if (typeof content === "string") {
            this.centerData.innerHTML = content;
        } else this.centerData.appendChild(content);

        return this;
    };
};

const loader = function (parent) {
    parent = parent || new Element(document.body);
    this.isLoading = false;
    if (parent.el === undefined) parent = new Element(parent);

    const blur = new Element("div", {
        className: "blur hidden",
        zIndex: dialogsTotal * 100
    }).appendTo(parent.el);

    const loader = new Element("span", {
        className: "loader hidden",
        zIndex: dialogsTotal * 101
    }).appendTo(parent.el);

    this.show = () => {
        this.isLoading = true;
        dialogsTotal++;
        loader.css({
            zIndex: dialogsTotal * 101
        });
        blur.css({
            zIndex: dialogsTotal * 100
        });
        loader.classList().remove("hidden");
        blur.classList().remove("hidden");
        setTimeout(() => {
            loader.center(parent).focus();
        }, 300);
        return this;
    };

    this.hide = () => {
        this.isLoading = false;
        dialogsTotal--;
        loader.classList().add("hidden");
        blur.classList().add("hidden");
        return this;
    };
};
let book = undefined;
const fonts = new arrayItem().add(
    "Arial (sans-serif)",
    "Verdana (sans-serif)",
    "Tahoma (sans-serif)",
    "Trebuchet MS (sans-serif)",
    "Times New Roman (serif)",
    "Georgia (serif)",
    "Garamond (serif)",
    "Courier New (monospace)",
    "Brush Script MT (cursive)"
);

function bookSettings(b, options) {
    this.chapterSettings = new arrayItem();
    if (options.chapterSettings && options.chapterSettings.length > 0) {
        options.chapterSettings.forEach(a => {
            let f = b.filesKeys.find(x => b.files[x].name === a.name);
            if (f) {
                let ch = new chapterSetting(f);
                Object.keys(a).forEach(k => {
                    ch[k] = a[k];
                });
                this.chapterSettings.add(ch);
            }
        });
    }
    this.textReplacement = new arrayItem(options.textReplacement);
    this.rate = options.rate || 1;
    this.pitch = options.pitch || 1;
    this.voice = options.voice || "";
    this.font = options.font || "Arial (sans-serif)";
    this.fontSize = options.fontSize || 22;
    this.textAlign = options.textAlign || "left";
    this.backgroundColor = options.backgroundColor || "#ffffff";
    this.color = options.color || "#000";
    this.inlineStyle = options.inlineStyle || "";
    this.name = b.name;
    this.selectedChapterIndex = options.selectedChapterIndex || 0;
    this.isBold = options.isBold || false;
    this.isFinished = options.isFinished || false;
}

function chapterSetting(file) {
    Object.keys(file).forEach(x => {
        this[x] = file[x];
    });
    this.scrollProgress = 0;
    this.audioProgress = 0;
    this.contentArray = new arrayItem();
    this.content = undefined;
    this.asyncArray = async () => {
        if (this.contentArray.length > 0) return this.contentArray;
        let text = await this.async("text");
        const div = new Element("div", {
            innerHTML: text
        });
        div.findAll("p,h1,h2,h3,h4,h5,h6").forEach(x => {
            let txt = x.el.innerText;
            if (txt && txt.trim().length > 0) {
                this.contentArray.add({
                    text: txt,
                    el: x
                });
            }
        });
        return this.contentArray;
    };

    this.hasNext = () => {
        return this.contentArray.length > this.audioProgress + 1;
    };

    this.hasPrev = () => {
        return this.audioProgress - 1 >= 0;
    };

    this.next = () => {
        if (this.hasNext()) {
            this.audioProgress++;
            book.loadChapter();
        } else book.next();
    };

    this.prev = () => {
        if (this.hasPrev()) this.audioProgress--;
        book.loadChapter();
    };

    this.jumpTo = index => {
        this.audioProgress = index;
        book.loadChapter();
    };

    this.async = async type => {
        if (this.content === undefined) this.content = await file.async(type);
        return this.content;
    };
}
// options {processHtml, enableLinks,onContextMenu}
function Book(body, options, files, settings) {
    createdElements.clear();
    settings = settings || {};
    this.contextMenu = undefined;
    resizEvents.clear();
    this.epubBody = body;
    this.selectedChapter = undefined;
    this.name = settings.name || files.name;
    this.filesKeys = Object.keys(files);
    this.files = files;
    this.options = options;
    this.menu = undefined;
    this.settings = new bookSettings(this, settings);
    this.voiceSettings = new VoiceSettings(this);
    this.change = new arrayItem();
    this.loader = new loader();
    this.currentPlaying = "";
    this.onUpdateSettings = async () => {
        await this.loadChapter();
        if (options.onSettingUpdate) options.onSettingUpdate(this.settings);
    };

    this.onChapterUpdate = async () => {
        await this.loadChapter();
        if (options.onChapterUpdate) options.onChapterUpdate();
    };
    this.play = async () => {
        while (this.loader.isLoading) await wait(10);
        if (!this.selectedChapter) return;
        let t =
            this.selectedChapter.contentArray[
                this.selectedChapter.audioProgress
            ].text;
        if (t != this.currentPlaying) {
            this.voiceSettings.speak(t);
            this.currentPlaying = t;
            this.menu.player.playing = true;
            this.loadChapter();
        }
    };

    this.stop = () => {
        this.currentPlaying = "";
        this.menu.player.playing = false;
        this.voiceSettings.pause();
    };
    resizEvents.add(() => {
        if (this.selectedChapter) this.loadChapter();
    });
    this.container = new Element("div", {
        id: "epubContainer",
        onscroll: ev => {
            if (!this.menu.showPlayer) {
                this.selectedChapter.scrollProgress =
                    this.container.el.scrollTop;
                if (this.options.onChapterUpdate)
                    this.options.onChapterUpdate();
                this.setProgress();
                this.bottomReached(ev.target);
                this.topReached();
            }
        }
    }).appendTo(body);
    this.container.val("");
    this.iframe = new Element("iframe", {
        scrolling: "no"
    }).appendTo(this.container.el);

    this.downmenu = undefined;
    this.progress = new Element("svg-progress-circle", {
        className: "progress"
    }).appendTo(this.container);

    this.getHtmlFilesOrder = async () => {
        try {
            const keys = Object.keys(this.files);
            const opf = keys.find(x => x.toLowerCase().indexOf(".opf") !== -1);
            const opfContent = await this.files[opf].async("text");
            let parser = new DOMParser();
            let htmlBody = parser.parseFromString(opfContent, "text/html");
            let items = [...htmlBody.querySelectorAll("manifest item")]
                .filter(
                    x =>
                        x.getAttribute("href").indexOf(".html") !== -1 ||
                        x.getAttribute("href").indexOf(".css") !== -1
                )
                .map(x => x.getAttribute("href"));

            if (items.length && !items.find(x => x.indexOf(".css") !== -1))
                items = [
                    ...items,
                    ...keys.filter(x => x.indexOf(".css") !== -1)
                ];
            return items;
        } catch (e) {
            console.error("getHtmlFilesOrder", e);
        }
        return [];
    };

    this.getFont = () => {
        let f = this.settings.font;
        let name = f.substring(0, f.indexOf("("));
        let style = f.substring(f.indexOf("(")).replace(/\(|\)/g, "");
        return `${name},${style}`;
    };

    this.setProgress = () => {
        this.menu.player.range
            .find("input")
            .val(this.selectedChapter.audioProgress);
        this.menu.player.range.setInput();
        if (this.menu.showPlayer) {
            if (!this.progress.classList().contains("hidden"))
                this.progress.classList().add("hidden");
        } else this.progress.classList().remove("hidden");
        this.progress.el.percent =
            (100 * this.container.el.scrollTop) /
            (this.container.el.scrollHeight - this.container.el.clientHeight);
    };

    this.image = async (file, img) => {
        const content = await file.async("arraybuffer");
        var buffer = new Uint8Array(content);
        var blob = new Blob([buffer.buffer]);
        img.src = URL.createObjectURL(blob);
    };

    this.load = async () => {
        this.loader.show();
        const htmlFiles = await this.getHtmlFilesOrder();
        const filesKeys = Object.keys(this.files);
        const keys = htmlFiles.length > 0 ? htmlFiles : filesKeys;
        try {
            for (let key of keys) {
                const k = filesKeys.find(
                    x => x.toLowerCase().indexOf(key.toLowerCase()) !== -1
                );
                if (!k) continue;
                const file = files[k];

                if (file === undefined || file.name === undefined) continue;
                if (
                    this.settings.inlineStyle.length <= 1 &&
                    file.name.indexOf(".css") !== -1
                ) {
                    this.settings.inlineStyle +=
                        "\n" + (await file.async("text"));
                } else if (
                    this.isValid(file) &&
                    !this.settings.chapterSettings.find(
                        f => f.name === file.name
                    )
                )
                    this.settings.chapterSettings.add(new chapterSetting(file));
            }

            await this.loadChapter(
                this.settings.chapterSettings[
                    this.settings.selectedChapterIndex
                ]
            );
        } catch (e) {
            console.error(e);
        }
        this.loader.hide();
    };

    this.hasNext = () => {
        return (
            this.settings.chapterSettings.length >
            this.settings.selectedChapterIndex + 1
        );
    };

    this.hasPrev = () => {
        return this.settings.selectedChapterIndex > 0;
    };

    this.jumpTo = index => {
        this.settings.selectedChapterIndex = index;
        this.selectedChapter = this.settings.chapterSettings[index];
        this.onChapterUpdate();
    };

    this.next = () => {
        if (this.hasNext() && !this.loader.isLoading)
            this.jumpTo(this.settings.selectedChapterIndex + 1);
    };

    this.prev = () => {
        if (this.hasPrev() && !this.loader.isLoading)
            this.jumpTo(this.settings.selectedChapterIndex - 1);
    };

    this.cleanName = name => {
        let n = name;
        if (n.indexOf("/") !== -1) {
            n = n.split("/");
            n = n[n.length - 1];
        }
        n = n.replace("OEBPS/", "");
        if (n.indexOf(".html") !== -1) n = n.substring(n.indexOf(".html"), -1);
        return n;
    };

    this.isValid = file => {
        if (
            file.name &&
            file.name.toLowerCase().indexOf(".html") !== -1 &&
            file.name.toLowerCase().indexOf("toc.html") == -1
        ) {
            return file;
        }
        return undefined;
    };

    this.write = async html => {
        const ifrm = this.iframe.el;
        const doc = ifrm.contentWindow
            ? ifrm.contentWindow.document
            : ifrm.contentDocument;
        await doc.open();
        await doc.write(html);
        await doc.close();
    };

    function invertColor(hexcolor) {
        try {
            // If a leading # is provided, remove it
            if (hexcolor.slice(0, 1) === "#") {
                hexcolor = hexcolor.slice(1);
            }

            // If a three-character hexcode, make six-character
            if (hexcolor.length === 3) {
                hexcolor = hexcolor
                    .split("")
                    .map(function (hex) {
                        return hex + hex;
                    })
                    .join("");
            }

            // Convert to RGB value
            let r = parseInt(hexcolor.substr(0, 2), 16);
            let g = parseInt(hexcolor.substr(2, 2), 16);
            let b = parseInt(hexcolor.substr(4, 2), 16);

            // Get YIQ ratio
            let yiq = (r * 299 + g * 587 + b * 114) / 1000;

            // Check contrast
            return yiq >= 128 ? "black" : "white";
        } catch (e) {
            return "black";
        }
    }

    function padZero(str, len) {
        len = len || 2;
        var zeros = new Array(len).join("0");
        return (zeros + str).slice(-len);
    }
    let timer;
    let timer0;
    this.bottomReached = obj => {
        clearTimeout(timer);
        if (!this.loader.isLoading)
            timer = setTimeout(() => {
                if (
                    !this.loader.isLoading &&
                    obj.scrollTop > obj.scrollHeight - obj.offsetHeight - 20
                ) {
                    this.selectedChapter.isFinished = true;
                    this.next();
                }
            }, 200);
    };

    this.topReached = () => {
        clearTimeout(timer0);
        if (!this.loader.isLoading)
            timer0 = setTimeout(() => {
                if (
                    !this.loader.isLoading &&
                    this.container.el.scrollTop <= 10 &&
                    this.settings.selectedChapterIndex > 0
                ) {
                    this.prev();
                }
            }, 200);
    };

    this.getPadding = () => {
        return this.menu.showPlayer || this.settings.selectedChapterIndex === 0
            ? 5
            : 200;
    };

    function escapeRegExp(text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }
    this.loadChapter = async chapter => {
        try {
            this.loader.show();
            chapter = chapter || this.selectedChapter;
            this.settings.selectedChapterIndex =
                this.settings.chapterSettings.findIndex(
                    x => x.name === chapter.name
                );
            this.selectedChapter = chapter;
            let text = await chapter.async("text");
            await chapter.asyncArray();
            if (this.menu && this.menu.showPlayer) {
                let cs = this.selectedChapter;
                text = await cs.asyncArray();
                text = `<div class="center"> ${
                    text[cs.audioProgress].text
                }</div>`;
            }
            this.settings.textReplacement.forEach(x => {
                let txt = escapeRegExp(x.a);
                let r = new RegExp(txt, "gmi");
                const span = new Element("span", { innerHTML: x.b });
                span.css({
                    backgroundColor: x.color,
                    color: invertColor(x.color)
                });
                if (x.comment && x.comment.length > 0) {
                    span.add(
                        new Element("handler", {
                            innerHTML: "&#9654;"
                        }).setAttr("onclick", "toggle(this)"),
                        new Element("folder", {
                            className: "hidden",
                            innerHTML: x.comment,

                            backgroundColor: x.color,
                            color: invertColor(x.color)
                        })
                    );
                }
                text = text.replace(r, span.el.outerHTML);
            });
            if (!this.menu) {
                this.downmenu = new downMenu();
                this.menu = new topMenu();
            }
            this.iframe.css({
                height: "auto"
            });
            await this.write("");
            const ifrm = this.iframe.el;
            const doc = ifrm.contentWindow
                ? ifrm.contentWindow.document
                : ifrm.contentDocument;
            let parser = new DOMParser();
            let htmlBody = parser
                .parseFromString(text, "text/html")
                .querySelector("body");
            htmlBody = htmlBody ? htmlBody.innerHTML : text;
            const script = `
              function toggle(e){
              	window.event.preventDefault();
              	window.event.stopPropagation();
              	let folder = e.parentNode.querySelector("folder")
              	if(!folder.classList.contains("hidden"))
              	   e.innerHTML ="&#9654;";
              	  else e.innerHTML = "&#9660;"
              	folder.classList.toggle("hidden")
              }
            `;
            const style = `
            folder{
            	display:block;
            	font-size:15px;
            }
            .hidden{display:none}
            .center{
            	display:inline-block;
            	position:relative;
            	width:100%;
            }
      p,*{
      line-height:${this.settings.fontSize * 1.7}px;
      font-size:${this.settings.fontSize}px;
      font-family:${this.getFont()};
      text-align:${this.settings.textAlign};
      background:${this.settings.backgroundColor};
      color:${invertColor(this.settings.backgroundColor)};
      font-weight:${this.settings.isBold ? "bold" : "normal"};
      }
      `;
            htmlBody =
                `
      <style> parameter{display:none;}
      img{max-width:100%;}
      ${this.settings.inlineStyle}
      ${style}
      </style><script>${script}</script>` + htmlBody;
            document.body.style.backgroundColor = this.settings.backgroundColor;

            [...document.querySelectorAll(".menuIcon div")].forEach(
                x =>
                    (x.style.backgroundColor = invertColor(
                        this.settings.backgroundColor
                    ))
            );

            await this.write(htmlBody);
            var body = doc.body,
                html = doc.documentElement;
            if (!this.options.enableLinks) {
                [...body.querySelectorAll("a")].forEach(
                    x =>
                        (x.onclick = () => {
                            return false;
                        })
                );
            }
            var height = Math.max(
                body.scrollHeight,
                body.offsetHeight,
                html.clientHeight,
                html.scrollHeight,
                html.offsetHeight,
                getOffet(body).height,
                this.container.offset().height
            );
            height += this.settings.fontSize * 1.7;
            this.iframe.css({
                height: height + "px",
                paddingTop: this.getPadding(),
                paddingBottom:
                    this.menu.showPlayer == false
                        ? 200
                        : this.settings.fontSize * 1.7
            });
            this.container.css({
                top: (this.menu.showPlayer ? 20 : 0) + "px",
                paddingBottom: this.menu.showPlayer ? 0 : 0
            });
            doc.body.onclick = () => {
                if (!this.contextMenu || this.contextMenu.menuState == 0) {
                    this.downmenu.toggle();
                    this.menu.toggle();
                }
            };

            for (let m of [...doc.querySelectorAll("img")]) {
                let src = m.src.split("/");
                src = src[src.length - 1].toLowerCase();
                let f = Object.keys(this.files).find(
                    x =>
                        this.files[x].name
                            .toLowerCase()
                            .indexOf(src.toLowerCase()) !== -1
                );
                if (f) await this.image(this.files[f], m);
            }

            this.change.forEach(x => x());
            this.menu.loadChapters(chapter);
            if (chapter.scrollProgress <= 0 && !this.menu.showPlayer)
                chapter.scrollProgress =
                    this.settings.selectedChapterIndex > 0 ? 200 : 0;
            if (
                chapter.isFinished &&
                chapter.scrollProgress > 200 &&
                !menu.showPlayer
            )
                chapter.scrollProgress -= 200;
            this.container.el.scrollTop = this.menu.showPlayer
                ? 0
                : chapter.scrollProgress;
            this.setProgress();
            this.contextMenu = new contextMenu(ifrm.contentWindow, this);
            if (this.menu.showPlayer)
                new center(doc.body.querySelector(".center"), doc.body)
                    .focus()
                    .destroy();
            if (this.menu.player.playing) this.play();
        } catch (e) {
            console.error(e);
        } finally {
            this.loader.hide();
        }
    };
}

function formField(label, options, ...dataList) {
    const doc = new Element("div", {
        className: "formContainer"
    });
    if (label.length > 1) {
        const lb = new Element("label", {
            innerHTML: label + ":"
        }).appendTo(doc);
    } else doc.classList().add("alone");
    if (!options || options.type !== "font") {
        const input = new Element(
            dataList && dataList.length > 0
                ? "select"
                : options && options.type == "textarea"
                ? "textarea"
                : "input",
            {
                type: "text",
                ...options,
                ...(options && options.type == "color"
                    ? { "data-jscolor": "{}", type: "", onchange: "" }
                    : {})
            }
        ).appendTo(doc);
        if (options && options.type === "color") {
            input.event("input", e => {
                if (options && options.onchange) {
                    options.onchange(e);
                }
            });
            input.el.readOnly = true;
            input.classList().add("jsc");
            let jsc = {
                format: options.format || "hexa",
                paletteSetsAlpha: options.format != "hex",
                alphaChannel: options.format != "hex"
            };
            input.attr("data-jscolor", JSON.stringify(jsc));
        }
        if (options && options.type === "range") {
            const output =
                options.handler ||
                new Element("label", {
                    className: "bubble",
                    innerHTML: input.val()
                }).appendTo(doc);
            doc.setInput = () => {
                let fixed = v => {
                    let r = v.toString().split(".");
                    if (r.length > 1) {
                        if (parseInt(r[1]) > 0) return v.toFixed(2);
                    }
                    return v.toFixed(0);
                };
                const range = input.el;
                const bubble = output.el;

                const min = range.min ? range.min : 0;
                const max = range.max ? range.max : 100;
                const val = parseFloat((range.value || max).toString());
                const newVal = (100 * val) / max;
                if (!options.procent) bubble.innerHTML = fixed(val);
                else bubble.innerHTML = fixed(newVal) + "%";
            };
            input.event("input", () => doc.setInput());
        }

        if (dataList && dataList.length > 0) {
            dataList.forEach(x =>
                input.add(
                    new Element("option", {
                        value: x,
                        innerHTML: x
                    })
                )
            );
        }
    } else {
        const c = new Element("div", {
            display: "flex"
        }).appendTo(doc);
        options.list.forEach(x => {
            let ft = fontButton(x, {
                color: "#000"
            });
            ft.event("click", e => {
                options.onclick(e, x);
            });
            ft.css({ color: "black" });
            ft.appendTo(c);
        });
    }
    return doc;
}

function horizentalMenu(onchange) {
    this.selectedIndex = -1;
    this.tabs = [];
    this.container = new Element("div", {
        className: "tab-menu"
    });
    this.tabsContainer = new Element("div", {
        className: "tab-container"
    }).appendTo(this.container.el);
    this.content = new Element("div", {
        className: "content"
    }).appendTo(this.container.el);

    this.addTabs = (...tabs) => {
        tabs.forEach((x, i) => {
            this.tabs.add(x);
            const a = new Element("a", {
                innerHTML: x.text,
                onclick: () => {
                    this.select(i);
                }
            }).appendTo(this.tabsContainer.el);
        });

        if (this.selectedIndex === -1) this.select(0);
        return this;
    };

    this.resize = () => {
        setTimeout(() => {
            const parent = this.content.el.parentNode;
            if (parent) {
                this.content.css({
                    "max-height": getOffet(parent).height - 40 + "px"
                });
            }
        }, 100);
    };

    resizEvents.add(() => {
        this.resize();
    });

    this.rindex = resizEvents.length - 1;

    this.select = index => {
        this.resize();
        if (this.selectedIndex == index) return;
        this.selectedIndex = index;
        this.content.classList().add("hidden");
        this.content.val("");
        this.content.add(this.tabs[index].content.el);
        this.content.show(10);
        this.tabsContainer.findAll("a").forEach((x, i) => {
            if (i == index) x.classList().add("selected");
            else x.classList().remove("selected");
        });

        if (onchange) onchange();
    };

    this.destroy = () => {
        resizEvents.removeAt(this.rindex);
    };
}

function downMenu() {
    this.container = new Element("div", {
        className: "DownMenu hidden"
    }).appendTo(book.epubBody);

    const top = new Element("div").appendTo(this.container);

    this.elContainer = new Element("div", {}).appendTo(this.container);
    let timer = undefined;
    const prev = touchable(() => book.prev(), {
        className: "link",
        innerHTML: "&laquo;"
    }).appendTo(this.elContainer.el);

    const range = new Element("input", {
        type: "range",
        min: 0,
        max: book.settings.chapterSettings.length - 1,
        value: book.settings.selectedChapterIndex,
        step: 1,
        onchange: () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                book.jumpTo(parseInt(range.val()));
            }, 500);
        }
    })
        .event("input", () => {
            procent.val(
                parseInt(range.val()) +
                    1 +
                    "/" +
                    book.settings.chapterSettings.length
            );
        })
        .appendTo(this.elContainer);

    const next = touchable(() => book.next(), {
        className: "link",
        innerHTML: "&raquo;"
    }).appendTo(this.elContainer);

    const procent = new Element("p", {
        className: "procent",
        innerHTML:
            book.settings.selectedChapterIndex +
            1 +
            "/" +
            book.settings.chapterSettings.length
    }).appendTo(top);

    const title = new Element("div")
        .appendTo(this.container)
        .add(new Element("p", {}))
        .find("p");

    book.change.add(() => {
        range.val(book.settings.selectedChapterIndex);
        procent.val(
            book.settings.selectedChapterIndex +
                1 +
                "/" +
                book.settings.chapterSettings.length
        );
        title.val(book.cleanName(book.selectedChapter.name));
    });

    this.toggle = () => {
        if (this.container.classList().contains("hidden"))
            this.container.show(1, 0.8);
        else this.container.hide();
    };
}
let etext = undefined;
function textReplacement(txt) {
    if (etext !== undefined) {
        etext.tabMenu.destroy();
        etext.dialog.destroy();
    }
    const tabs = [
        {
            text: "TextReplacement",
            content: new Element("div", { className: "TextReplacement" }).add(
                new Element("h1", {
                    innerHTML: "Replace text",
                    className: "ptitle"
                }).add(
                    new Element("span", {
                        className: "underTitle",
                        innerHTML: "This operation applies to the entire book"
                    })
                ),
                new formField("Text-A", {
                    type: "textarea",
                    rows: 4,
                    cols: 50,
                    className: "txt-a",
                    value: txt
                }),
                new formField("Text-B", {
                    type: "textarea",
                    rows: 4,
                    cols: 50,
                    className: "txt-b",
                    placeholder:
                        "leave it empty, if simple to remove the text above"
                }),
                new formField("Comment", {
                    placeholder: "Add comment",
                    rows: 4,
                    cols: 50,
                    type: "textarea",
                    className: "comment"
                }),
                new formField("BackgroundColor", {
                    type: "color",
                    value: "#FFFFFF00",
                    className: "color"
                }),
                new Element("button", {
                    className: "submit",
                    innerHTML: "Save"
                }).event("click", () => {
                    let tab = tabs[0].content;
                    let a = tab.find(".txt-a");
                    let b = tab.find(".txt-b");
                    book.settings.textReplacement.add({
                        a: a.val(),
                        b: b.val(),
                        comment: tab.find(".comment").val(),
                        color: tab.find(".color").val()
                    });
                    book.onUpdateSettings();
                    this.dialog.close();
                })
            )
        }
    ];
    this.tabMenu = new horizentalMenu().addTabs(...tabs);
    this.dialog = new dialog(book.epubBody)
        .title("TextReplacement SETTINGS")
        .data(this.tabMenu.container.el);
    etext = this;
    this.dialog.open();
}

function topMenu() {
    const reg = /(\.)| |\//g;
    this.firstLoad = true;
    this.container = new Element("div", {
        className: "topMenu hidden"
    }).insertBefore(book.epubBody);
    this.player = new player(this);
    if (book.options.onBack) {
        new Element("i", {
            className: "menuIcon toback",
            innerHTML: `<span class="material-symbols-outlined">arrow_back</span>`
        })
            .appendTo(this.container)
            .event("click", () => book.options.onBack());
    }
    this.btnPlayer = new Element("i", {
        className: "menuIcon",
        innerHTML: `<span class="material-symbols-outlined">smart_display</span>`
    }).appendTo(this.container);
    this.btnPlayer.event("click", () => {
        this.showPlayer = !this.showPlayer;
        book.stop();
        book.loadChapter();
    });
    this.button = new Element("i", {
        className: "menuIcon",
        innerHTML: `<span class="material-symbols-outlined">menu</span>`,
        onclick: () => this.dialog.open()
    }).appendTo(this.container);

    this.validateScroll = () => {
        setTimeout(() => {
            if (book === undefined || book.selectedChapter === undefined)
                return;
            const el = document.querySelector(
                "." + book.selectedChapter.name.replace(reg, "")
            );
            if (el && el.parentNode && el.parentNode.parentNode)
                scrollTo(el, el.parentNode.parentNode);
        }, 10);
    };

    this.isVisible = () => !this.container.classList().contains("hidden");

    this.toggle = () => {
        if (this.container.classList().contains("hidden")) {
            this.container.show(1, 0.8);
            this.player.container.css({ top: 45 });
        } else {
            this.player.container.css({ top: 1 });
            this.container.hide();
        }
    };

    const tabs = [
        {
            text: "FONTS",
            content: new Element("div")
                .add(
                    new formField("Font-Size", {
                        type: "range",
                        min: 12,
                        max: 35,
                        step: 1,
                        value: book.settings.fontSize,
                        onchange: () => {
                            book.settings.fontSize = parseInt(
                                tabs[0].content.find("input").val()
                            );
                            book.onUpdateSettings();
                        }
                    })
                )
                .add(
                    new formField(
                        "Font",
                        {
                            list: "font-f",
                            value: book.settings.font,
                            onchange: e => {
                                book.settings.font = e.target.value;
                                book.onUpdateSettings();
                            }
                        },
                        ...fonts
                    )
                )
                .add(
                    new formField("TextAlign", {
                        type: "font",
                        list: [
                            "format_align_left",
                            "format_align_center",
                            "format_align_right",
                            "format_align_justify"
                        ],
                        onclick: (e, lbl) => {
                            let s = lbl.split("_");
                            book.settings.textAlign = s[s.length - 1];
                            book.onUpdateSettings();
                        }
                    })
                )
                .add(
                    new formField("Color", {
                        type: "color",
                        format: "hex",
                        value: book.settings.backgroundColor,
                        onchange: e => {
                            book.settings.backgroundColor = e.target.value;
                            book.onUpdateSettings();
                        }
                    })
                )
                .add(
                    new SelectableButton(
                        "FontWeight",
                        {
                            onclick: e => {
                                book.settings.isBold = !book.settings.isBold;
                                book.onUpdateSettings();
                            },
                            className: "link"
                        },
                        "Bold",
                        "Normal"
                    ).deSelect().el
                )
                .add(
                    new SelectableButton(
                        "Fullscreen",
                        {
                            type: "button",
                            className: "link",
                            value: "Enter Fullscreen",
                            onclick: () => {
                                openFullscreen();
                            }
                        },
                        "Exit FullScreen",
                        "Enter FullScreen"
                    ).deSelect().el
                )
        },
        {
            text: "CHAPTERS",
            content: new Element("div", {
                className: "chapters"
            })
        },
        {
            text: "VOICE SETTINGS",
            content: new Element("div").add(
                new formField(
                    "Voice",
                    {
                        type: "select",
                        onchange: e => {
                            book.voiceSettings.voice = e.target.value;
                            book.onUpdateSettings();
                        }
                    },
                    book.voiceSettings.voices
                ),
                new formField("Rate", {
                    type: "range",
                    max: 3,
                    min: 0.7,
                    step: 0.1,
                    value: book.voiceSettings.rate,
                    onchange: e => {
                        book.voiceSettings.rate = parseFloat(e.target.value);
                        book.onUpdateSettings();
                    }
                }),
                new formField("Pitch", {
                    type: "range",
                    max: 3,
                    min: 0.7,
                    step: 0.1,
                    value: book.voiceSettings.rate,
                    onchange: e => {
                        book.voiceSettings.pitch = parseFloat(e.target.value);
                        book.onUpdateSettings();
                    }
                })
            )
        },
        {
            text: "INLINE STYLE",
            content: new Element("textarea", {
                rows: 20,
                cols: 33,
                onchange: () => {
                    if (book) {
                        book.settings.inlineStyle = tabs[3].content.val();
                        book.onUpdateSettings();
                    }
                }
            })
        }
    ];

    this.tabMenu = new horizentalMenu(() => this.validateScroll()).addTabs(
        ...tabs
    );
    this.dialog = new dialog(book.epubBody, () => {
        this.tabMenu.select(0);
        this.validateScroll();
    })
        .title("SETTINGS")
        .data(this.tabMenu.container.el);

    this.loadChapters = ch => {
        if (book) {
            if (this.firstLoad) {
                tabs[3].content.val(book.settings.inlineStyle);
                this.firstLoad = false;
            }
            const ctab = tabs[1].content;
            ctab.val("");
            book.settings.chapterSettings.forEach((x, i) => {
                let chapter = x;
                if (book.isValid(x))
                    ctab.add(
                        new Element("a", {
                            innerHTML: book.cleanName(x.name),
                            className:
                                (ch.name === x.name ? " selected " : "") +
                                x.name.replace(reg, ""),
                            onclick: () => {
                                book.jumpTo(i);
                            }
                        }).el
                    );
            });
        }
    };
}
topMenu.prototype = {
    sp: false,
    get showPlayer() {
        return this.sp;
    },
    set showPlayer(v) {
        this.sp = v;
        if (this.sp) {
            if (!book.menu.container.classList().contains("hidden"))
                book.menu.player.container.css({
                    top: 45
                });
            else book.menu.player.container.css({ top: 1 });
            if (!this.btnPlayer.classList().contains("selected"))
                this.btnPlayer.classList().add("selected");
        } else this.btnPlayer.classList().remove("selected");
        this.player.toggle();
        return this.sp;
    }
};

function fontButton(lbl, options) {
    let btn = new Element("span", {
        className: "menuIcon material-symbols-outlined",
        ...(options || {}),
        innerHTML: lbl
    });

    return btn;
}

function player(menu) {
    this.container = new Element("div", {
        className: "player hidden"
    }).appendTo(book.epubBody);

    this.range = formField("", {
        type: "range",
        min: 0,
        max: book.selectedChapter.contentArray.length - 1,
        value: book.selectedChapter.audioProgress,
        procent: true
    }).appendTo(this.container);
    this.range.css({ width: "100%" });
    let timer = undefined;
    this.range.event("input", e => {
        clearTimeout(timer);
        setTimeout(() => {
            let p = parseInt(e.target.value);
            book.selectedChapter.jumpTo(p);
        }, 300);
    });
    this.prev = new Element("i", {
        className: "menuIcon",
        innerHTML: `<span class="material-symbols-outlined">skip_previous</span>`
    }).appendTo(this.container);
    this.prev.event("click", () => {
        book.selectedChapter.prev();
    });
    this.play = new Element("i", {
        className: "menuIcon",
        innerHTML: `<span class="material-symbols-outlined">play_circle</span>`
    }).appendTo(this.container);
    this.play.event("click", () => {
        if (this.playing) {
            book.stop();
        } else {
            book.play();
        }
    });

    this.next = new Element("i", {
        className: "menuIcon",
        innerHTML: `<span class="material-symbols-outlined">skip_next</span>`
    }).appendTo(this.container);
    this.next.event("click", () => {
        book.selectedChapter.next();
    });
    this.toggle = () => {
        if (menu.showPlayer && this.container.classList().contains("hidden")) {
            this.container.show(1, 0.8);
        } else if (!menu.showPlayer) this.container.hide();
    };
}
player.prototype = {
    pl: false,
    get playing() {
        return this.pl;
    },
    set playing(v) {
        this.pl = v;
        if (v) book.menu.showPlayer = true;
        if (!v) {
            this.play.find("span").val("play_circle");
        } else {
            this.play.find("span").val("pause_circle");
        }
        return this.pl;
    }
};
let externalContainer = undefined;
async function fetch_file(url, options) {
    try {
        const data = await fetch(url);
        const buffer = await data.arrayBuffer();
        const content = await JSZip.loadAsync(buffer);
        book = new Book(
            externalContainer,
            options,
            content.files,
            options.settings
        );
        await book.load();
    } catch (e) {
        console.error(e);
        throw e;
    }
}

async function downloadFile(file, options) {
    try {
        const data = await JSZip.loadAsync(file);
        data.files.name = file.name;
        book = new Book(
            externalContainer,
            options,
            data.files,
            options.settings
        );
        await book.load();
    } catch (e) {
        console.error(e);
        throw e;
    }
}

const ReadFile = async (urlOrFile, options) => {
    externalContainer = options.container;
    if (typeof urlOrFile === "string") await fetch_file(urlOrFile, options);
    else await downloadFile(urlOrFile, options);
    return book;
};

window.onresize = () => resizEvents.forEach(x => x());
