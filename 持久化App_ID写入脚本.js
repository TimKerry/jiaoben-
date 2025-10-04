$persistentStore.write('u6iogfd0', 'fmz200_TF_APP_ID');
$notification.post('已写入 fmz200_TF_APP_ID = ' + ($persistentStore.read('fmz200_TF_APP_ID') || '空'));
$done();
