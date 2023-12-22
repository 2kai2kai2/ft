const params = new URL(document.URL).searchParams;
const id_param = params.get("id")

/**
 * @typedef {Object} FileTransfer
 * @property {String} name
 * @property {Blob} content
 */

/** @type {HTMLDivElement} */
const read_more_div = document.getElementById("more_info_container");
/** @type {HTMLParagraphElement} */
const read_more_p = document.getElementById("more_info");
function click_read_more() {
    read_more_div.classList.toggle("open");
}

if (id_param) {
    // RECEIVER
    /** @type {HTMLDivElement} */
    const receiver_div = document.getElementById("receiver");
    receiver_div.hidden = false;
    var finished = false;

    /** @type {HTMLDivElement} */
    const log_div = document.getElementById("fetcher_log");

    function add_to_fetcher_log(text) {
        let el = document.createElement("p");
        el.textContent = text;
        log_div.append(el);
    }

    function clear_receiver_options() {
        for (el of document.getElementsByClassName("receiver_display_option")) {
            el.hidden = true;
        }
    }

    const error_context = {
        "browser-incompatible": "Maybe a different browser.",
        "disconnected": "Close and re-open the tab.",
        "invalid-id": "This URL is invalid. Ask the sender for a new one.",
        //"invalid-key": "That's strange.",
        //"network": "",
        "peer-unavailable": "This URL is invalid. Perhaps the sender closed their browser?",
        //"ssl-unavailable": "",
        //"server-error": "",
        "socket-error": "Please try again.",
        "socket-closed": "Please try again.",
        "unavailable-id": "Please try again.",
        "webrtc": "An internal WebRTC error occurred."
    }

    function set_receiver_error(message = "") {
        clear_receiver_options()
        if ((typeof message) != "string" || message.length == 0) {
            document.getElementById("error_message").textContent = "(no error message)";
        } else {
            let text = "Error: " + message;
            if (error_context[message]) {
                text += `<br><em>${error_context[message]}</em>`
            }
            document.getElementById("error_message").innerHTML = text;
        }
        document.getElementById("receiver_error_screen").hidden = false;
    }

    add_to_fetcher_log("Starting...")
    var peer = new Peer();
    peer.on("close", () => {
        add_to_fetcher_log("Closed p2p identity");
    });
    peer.on("error", (err) => {
        set_receiver_error(err.type)
        add_to_fetcher_log(`p2p identity error occurred: ${err.type}`);
    });
    peer.on("open", () => {
        add_to_fetcher_log("Identity established, trying to connect...");
        var conn = peer.connect(id_param);

        conn.on("open", () => {
            add_to_fetcher_log("Connection established...");
        });
        conn.on("close", () => {
            add_to_fetcher_log("Connection closed.");
        });
        conn.on("error", (err) => {
            if (!finished) {
                add_to_fetcher_log(`Connection error occurred: ${err.type}`);
                set_receiver_error()
            }
            console.error("Potential Post-Receive Error:", err)
        });
        conn.on("data", (/** @type {FileTransfer} */ data) => {
            add_to_fetcher_log("Data received...");
            const url = URL.createObjectURL(new Blob([data.content]));
            const a = document.createElement("a");
            a.href = url;
            a.download = data.name ?? "download";
            document.body.appendChild(a);

            add_to_fetcher_log("Saving file...");
            a.dispatchEvent(
                new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                })
            );
            document.body.removeChild(a);

            clear_receiver_options()
            document.getElementById("receiver_completed").hidden = false;
            conn.close()
        });
    });
} else {
    // SENDER
    /** @type {HTMLDivElement} */
    const sender_div = document.getElementById("sender");
    sender_div.hidden = false;

    /** @type {HTMLInputElement} */
    const file_input = document.getElementById("file_input");
    /** @type {HTMLLabelElement} */
    const file_input_label = document.getElementById("file_input_label");
    /** @type {HTMLParagraphElement} */
    const file_label_name = document.getElementById("file_label_name");
    /** @type {HTMLInputElement} */
    const start = document.getElementById("sender_start")
    /** @type {HTMLDivElement} */
    const link_div = document.getElementById("link_div");

    var in_progress_transfers = 0;
    var completed_transfers = 0;
    var failed_transfers = 0;

    /** @type {HTMLDivElement} */
    const sender_connections_div = document.getElementById("sender_connections");
    /** @type {HTMLParagraphElement} */
    const ongoing_connections_p = document.getElementById("ongoing_connections_num");
    /** @type {HTMLParagraphElement} */
    const finished_connections_p = document.getElementById("finished_connections_num");
    /** @type {HTMLParagraphElement} */
    const failed_connections_p = document.getElementById("failed_connections_num");
    function update_current_transfers() {
        ongoing_connections_p.textContent = in_progress_transfers.toString();
        finished_connections_p.textContent = completed_transfers.toString();
        failed_connections_p.textContent = failed_transfers.toString();
    }

    // Selected file can either be from file input, or from drag-and-drop
    /** @type {File?} */
    var selected_file = null;

    /** @param {File} [file]  */
    function new_selected_file(file) {
        if (!file) {
            selected_file = null;
            file_label_name.textContent = "Select File";
            start.disabled = true;
        } else {
            selected_file = file;
            let name = file.name;
            if (name.length > 40) {
                file_label_name.textContent = name.substring(0, 40) + "...";
            } else {
                file_label_name.textContent = name;
            }
            start.disabled = false;
        }
    }

    file_input.onchange = () => {
        new_selected_file(file_input.files.item(0));
    }

    /** @type {HTMLDivElement} */
    const drag_overlay = document.getElementById("dragover_overlay");
    document.body.ondragenter = (ev) => {
        if (file_input.disabled) {
            return
        }
        console.log("dragenter", ev.target);
        if (ev.dataTransfer.types.includes("Files")) {
            drag_overlay.classList.add("active");
            ev.preventDefault();
        }
    }
    // if we any drag leave, then set a timeout
    // if we have a dragover event before then, that means we didn't actually leave
    /** @type {number | null} */
    var drag_leave_timeout = null;

    document.body.ondragleave = (ev) => {
        console.log(ev.target.tagName);
        if (file_input.disabled) {
            return
        }
        console.log("dragleave", ev.target);
        if (drag_leave_timeout === null) {
            drag_leave_timeout = setTimeout(() => {
                drag_overlay.classList.remove("active");
            }, 100);
            // I really hope this is enough time
        }
    }
    document.body.ondragover = (ev) => {
        if (file_input.disabled) {
            return
        }
        if (ev.dataTransfer.types.includes("Files")) {
            clearTimeout(drag_leave_timeout); // does nothing if already null
            drag_leave_timeout = null;
            //console.log("dragover", ev.target);
            drag_overlay.classList.add("active"); // just in case it accidentally got removed
            ev.preventDefault();
        }
    }
    document.body.ondrop = (ev) => {
        if (file_input.disabled || ev.dataTransfer.files.length == 0) {
            return;
        }
        let file = ev.dataTransfer.files.item(0);
        new_selected_file(file);
        clearTimeout(drag_leave_timeout); // does nothing if already null
        drag_leave_timeout = null;
        drag_overlay.classList.remove("active");
        ev.preventDefault()
    }

    /** @param {String} uuid */
    function set_download_link(uuid) {
        const link = document.baseURI + "?id=" + uuid;

        /** @type {HTMLParagraphElement} */
        const link_text = document.getElementById("link_copy");
        link_text.textContent = link;

        /** @type {HTMLDivElement} */
        const link_qr = document.getElementById("qrcode");
        new QRCode(link_qr, link);

        start.hidden = true;
        link_div.hidden = false;
        sender_connections_div.hidden = false;
    }

    function click_copy_link() {
        navigator.clipboard.writeText(document.getElementById('link_copy').textContent).then(
            () => {
                const icon = document.getElementById("link_copy_icon");
                icon.classList.replace("fa-clone", "fa-check");
                // TODO: uncheck if things change?
            },
            () => {
                console.error("Failed to copy to clipboard.");
            }
        );
    }

    function start_connections() {
        if (file_input.files.length == 0) {
            alert("Please select a file to send.");
            return;
        }
        start.disabled = true;
        file_input.disabled = true;
        file_input_label.setAttribute("disabled", "");
        let file = selected_file;
        console.log("Sending file: ", file);

        var peer = new Peer();
        peer.once("open", (id) => {
            set_download_link(id);

            peer.on("connection", (conn) => {
                in_progress_transfers += 1;
                update_current_transfers()
                console.log(conn);
                conn.on("close", () => {
                    // TODO: hopefully this means we are done.
                    in_progress_transfers -= 1;
                    completed_transfers += 1;
                    update_current_transfers()
                    console.log(`connection with ${conn.peer} closed.`);
                });
                conn.on("error", (err) => {
                    in_progress_transfers -= 1;
                    failed_transfers += 1;
                    update_current_transfers()
                    console.error("connection errored:", err);
                });
                // TODO: implement connection count ui
                conn.once("open", () => {
                    console.log("sending to", conn.connectionId);
                    conn.send({ "name": file.name, "content": file });
                    console.log("done");
                });
            });
        });
    }
}

// insert our base url into all <a> elements with class `site_link`
for (el of document.getElementsByClassName("site_link")) {
    el.href = document.URL.split("?")[0];
}