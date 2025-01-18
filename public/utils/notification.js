var socket = io();
socket.on('notificationMemberAddSent', async m => {
    let date = new Date()
    let data = await $.get(`/user`);
    if (m.email != data["email"]) return;
    document.getElementById("notificationHere").innerHTML += `<div class="notification-box" id="${date}">
                                    <span class="notification-message">${m.message}</span>
                                    <button class="close-btn" onclick="closeNotification('${date}')">×</button>
                                </div>`
    setTimeout(() => {
        if (!document.getElementById(`${date}`)) return;
        document.getElementById(`${date}`).style.display = 'none';
    }, 10000);
})

function closeNotification(id) {
    document.getElementById(id).style.display = 'none';
}

socket.on('notificationMemberRemoveSent', async m => {
    let date = new Date()
    let data = await $.get(`/user`);
    if (m.email != data["email"]) return;
    document.getElementById("notificationHere").innerHTML += `<div class="notification-box" id="${date}">
                                    <span class="notification-message">${m.message}</span>
                                    <button class="close-btn" onclick="closeNotification('${date}')">×</button>
                                </div>`
    setTimeout(() => {
        if (!document.getElementById(`${date}`)) return;
        document.getElementById(`${date}`).style.display = 'none';
    }, 10000);
});

socket.on('notificationProjectLeaveSent', async m => {
    let date = new Date()
    let data = await $.get(`/user`);
    for (var i in m.members) {
        if (m.members[i].email === data["email"]) {
            document.getElementById("notificationHere").innerHTML += `<div class="notification-box" id="${date}">
                                    <span class="notification-message">${m.message}</span>
                                    <button class="close-btn" onclick="closeNotification('${new Date()}')">×</button>
                                </div>`
            setTimeout(() => {
                if (!document.getElementById(`${date}`)) return;
                document.getElementById(`${date}`).style.display = 'none';
            }, 10000);
        }
    }
});

socket.on('notificationProjectUpdateSent', async m => {
    let date = new Date()
    let data = await $.get(`/user`);
    for (var i in m.members) {
        if (m.members[i].email === data["email"]) {
            document.getElementById("notificationHere").innerHTML += `<div class="notification-box" id="${date}">
                                    <span class="notification-message">${m.message}</span>
                                    <button class="close-btn" onclick="closeNotification('${new Date()}')">×</button>
                                </div>`
            setTimeout(() => {
                if (!document.getElementById(`${date}`)) return;
                document.getElementById(`${date}`).style.display = 'none';
            }, 10000);
        }
    }
});