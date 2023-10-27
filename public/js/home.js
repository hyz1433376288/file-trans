
new Vue({

  el: '#app',
  data: {
    fileList: [] ,
    chunkSize: 1024*1024,
    start:0,
    file:{size:0}

  },
  methods: {
    getFileList() {
      // 使用 Axios 或其他 HTTP 库发送 POST 请求
      // 请确保在实际项目中替换URL和其他配置
      axios.post('/api/getFileList')
        .then((response) => {
          this.fileList = response.data; // 更新文件列表数据
        })
        .catch((error) => {
          console.error('获取文件列表失败', error);
        });
    },
    downloadFile(fileName) {
      // 构建文件下载链接
      const downloadLink = document.createElement('a');
      downloadLink.href = `https://172.29.150.176:8080/upload/${fileName}`; // 替换成你的下载接口URL
      downloadLink.target = '_blank'; // 在新窗口中打开
      downloadLink.download = fileName; // 下载时保存的文件名
      downloadLink.click(); // 模拟点击下载链接
    },
    upload(index){
      let  btnFile = document.getElementById('btnFile');
      let file = btnFile.files[0];
      let [fname, fext] = file.name.split('.');

      this.file.size = file.size;

      let start = index * this.chunkSize;
      if (start > file.size){
        this.merge(file.name);
        return;
      }
     
      let blob = file.slice(start, start+this.chunkSize);
      let blobName = `${fname}.${index}.${fext}`;
      let blobFile = new File([blob], blobName);

      // 创建一个 Blob 对象来存储头部信息
      // const headerBlob = new Blob([JSON.stringify(header)], { type: 'application/json' });
      // const fileBlob = file.slice(start, start + this.chunkSize);
      // console.log("header size", headerBlob.size);
      // console.log("file size", fileBlob.size);

      // const combinedBlob = new Blob([headerBlob, fileBlob]);
      // const blobName = `${fname}.${index}.${fext}`;
      // const blobFile = new File([combinedBlob], blobName);
      // console.log("Final size", blobFile.size);

      let formData = new FormData();
      formData.append('file', blobFile);
      axios.post('/upload', formData).then(res => {
        console.log("POST 的回调函数执行");
        console.log(res);
        
        this.upload(++index);
        // 更新进度条 （没有用？
        this.start = start;
      })

    },
    merge(name){
      axios.post('/merge', {name:name}).then(res => {
        console.log("MERGE 的回调函数执行");
        console.log(res);
      })
    }

  }
});