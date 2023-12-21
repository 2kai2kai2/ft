const params = new URL(document.URL).searchParams;
const id_param = params.get("id")

/**
 * @typedef {Object} FileTransfer
 * @property {String} name
 * @property {Blob} content
 */

if (id_param) {
    // RECEIVER
    /** @type {HTMLDivElement} */
    const receiver_div = document.getElementById("receiver");
    receiver_div.hidden = false;
    var finished = false;

    function set_receiver_error(message = "") {
        for (el of document.getElementsByClassName("receiver_display_option")) {
            el.hidden = true;
        }
        document.getElementById("receiver_error_screen").hidden = false;
        if ((typeof message) != "string" || message.length == 0) {
            document.getElementById("error_message").textContent = "(no error message)";
        } else {
            document.getElementById("error_message").textContent = message;
        }
    }

    var peer = new Peer();
    peer.on("close", () => {console.log("peer closed.");});
    peer.on("error", (err) => {
        set_receiver_error(err.type)
        console.log("peer errored:", err);
    });
    peer.on("open", () => {
        console.log("peer opened");
        var conn = peer.connect(id_param);
        console.log(conn);
        conn.on("open", () => {console.log("connection opened");});
        conn.on("close", () => {console.log("connection closed.");});
        conn.on("error", (err) => {
            if (!finished) {
                set_receiver_error()
            }
        });
        conn.on("data", (/** @type {FileTransfer} */ data) => {
            const url = URL.createObjectURL(new Blob([data.content]));
            const a = document.createElement("a");
            a.href = url;
            a.download = data.name ?? "download";
            document.body.appendChild(a);

            a.dispatchEvent(
                new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                })
            );
            document.body.removeChild(a);
        });
    });
} else {
    // SENDER
    /** @type {HTMLDivElement} */
    const sender_div = document.getElementById("sender");
    sender_div.hidden = false;

    /** @type {HTMLInputElement} */
    const file_input = document.getElementById("file_input");
    /** @type {HTMLParagraphElement} */
    const file_label_name = document.getElementById("file_label_name");
    /** @type {HTMLInputElement} */
    const start = document.getElementById("sender_start")
    /** @type {HTMLDivElement} */
    const link_div = document.getElementById("link_div");

    file_input.onchange = (ev) => {
        if (file_input.files.length === 0) {
            file_label_name.textContent = "Select File";
            start.disabled = true;
        } else {
            let name = file_input.files.item(0).name;
            if (name.length > 40) {
                file_label_name.textContent = name.substring(0, 40) + "...";
            } else {
                file_label_name.textContent = name;
            }
            start.disabled = false;
        }
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
    }

    function start_connections() {
        if (file_input.files.length == 0) {
            alert("Please select a file to send.");
            return;
        }
        start.disabled = true;
        file_input.disabled = true;
        let file = file_input.files.item(0);
        console.log(file);

        var peer = new Peer();
        peer.once("open", (id) => {
            set_download_link(id);

            peer.on("connection", (conn) => {
                console.log(conn);
                conn.on("data", (data) => {console.log("received data??");});
                conn.on("close", () => {console.log("connection closed.");});
                conn.on("error", (err) => {console.log("connection errored:", err);});
                // TODO: update the ui
                conn.once("open", () => {
                    console.log("sending to", conn.connectionId)
                    conn.send({"name": file.name, "content": file});
                    console.log("done");
                    //conn.close();
                });
            });
        });
    }
}

// insert our base url into all <a> elements with class `site_link`
for (el of document.getElementsByClassName("site_link")) {
    el.href = document.baseURI;
}