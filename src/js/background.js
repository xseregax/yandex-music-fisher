// todo: предварительная загрузка страницы может не вызвать это событие
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading') {
        utils.addIconToTab(tab);
    }
});

chrome.pageAction.onClicked.addListener(function (tab) {
    chrome.pageAction.hide(tab.id);
    var page = utils.getUrlInfo(tab.url);
    if (page.isPlaylist) {
        yandex.getPlaylist(page.username, page.playlistId, downloader.downloadPlaylist, function (error) {
            console.error(error);
            log.addMessage(error);
            utils.addIconToTab(tab);
        });
    } else if (page.isTrack) {
        yandex.getTrack(page.trackId, downloader.downloadTrack, function (error) {
            console.error(error);
            log.addMessage(error);
            utils.addIconToTab(tab);
        });
    } else if (page.isAlbum) {
        yandex.getAlbum(page.albumId, downloader.downloadAlbum, function (error) {
            console.error(error);
            log.addMessage(error);
            utils.addIconToTab(tab);
        });
    }
});

chrome.downloads.onChanged.addListener(function (delta) {
    chrome.downloads.search({
        id: delta.id
    }, function (downloads) {
        if (!downloads.length) {
            // todo: выяснить, что за херня - часто бывает, хз почему
            var message = 'Не найдена загрузка по id, для которой произошло событие';
            console.error(message, delta);
            log.addMessage(message);
            return;
        }
        var name = downloads[0].byExtensionName;
        if (name && name === 'Yandex Music Fisher') {
            downloader.onChange(delta);
        }
    });
});

chrome.runtime.onInstalled.addListener(function (details) {
    // todo: перейти с localStorage на chrome.storage
    if (!localStorage.getItem('downloadThreadCount')) {
        localStorage.setItem('downloadThreadCount', 4);
    }
    if (!localStorage.getItem('albumCoverSize')) {
        localStorage.setItem('albumCoverSize', '460x460');
    }
    chrome.tabs.query({
        url: '*://music.yandex.ru/*'
    }, function (tabs) {
        for (var i = 0; i < tabs.length; i++) {
            utils.addIconToTab(tabs[i]);
        }
    });
});

chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
    // возобновление закачек
    var notificationData = downloader.notifications[notificationId];
    var tracks = notificationData.interruptedTracks;
    downloader.notifications[notificationId].interruptedTracks = [];
    for (var i = 0; i < tracks.length; i++) {
        downloader.add(tracks[i].type, tracks[i].cargo, tracks[i].options);
    }

    var type = notificationId.split('#')[0];
    switch (type) {
        case 'track':
            chrome.notifications.update(notificationId, {
                title: 'Загрузка...',
                buttons: []
            }, function (wasUpdated) {
            });
            break;
        case 'album':
        case 'playlist':
            chrome.notifications.update(notificationId, {
                title: 'Загрузка (' + notificationData.trackCount + ' из ' + notificationData.totalTrackCount + ')...',
                buttons: []
            }, function (wasUpdated) {
            });
            break;

    }
});
