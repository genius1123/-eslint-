const vscode = require('vscode');
const fs = require("fs");

let fileData = ""; //读取文件后的字符数据
let datas = []; //通过lineBreak分割后的字符数组
let curPage = 0; //当前datas索引（分页记录）
const tipTxt = "【阅读进度，勿删！Reading progress, do not delete!】"; //文件第一行存储阅读进度文字
let currentText = "";

const lineBreak = "\r\n"; //分页使用的分割字符
let filePath = ""; //文件路径
let replaceMark = "/*$*/"; //替换标记


function activate(context: vscode.ExtensionContext) {
	//变更当前激活文件时触发（用于记录阅读进度）
	vscode.window.onDidChangeActiveTextEditor(() => {
		saveReadProgress();
	});

	//读取文件并插入注释
	let disposable = vscode.commands.registerCommand('constReadNovel.constReadNovelStart', function () {
		fileData = "";
		datas = [];
		curPage = 0;
		// 没有设置文件地址
		if (!vscode.workspace.getConfiguration().get('constReadNovel.filePath')) {
			vscode.window.showErrorMessage('找不到此文件，请到设置里添加文件地址');
			return;
		}
		filePath = vscode.workspace.getConfiguration().get('constReadNovel.filePath').replace(/(^\s*)|(\s*$)/g, "");

		replaceMark = vscode.workspace.getConfiguration().get('constReadNovel.replaceMark');

		//文件存在检测
		if (filePath === "") {
			vscode.window.showErrorMessage('文件不能存在，请到设置里添加文件地址');
			return;
		};

		//文件类型检测
		if (getFileType(filePath) !== "txt") {
			vscode.window.showErrorMessage('文件类型不正确，只支持utf-8编码的txt文件');
			return;
		};

		//打开文件
		try {
			fileData = fs.readFileSync(filePath, 'utf-8');
		} catch (error) {
			vscode.window.showErrorMessage(error.toString());
			return;
		}

		curPage = getSavePage(fileData);
		datas = fileData.split(lineBreak);
		console.log("过滤前段落长度：", datas.length);
		datas = datas.filter(str => isEmptyLine(str));
		console.log("过滤后段落长度：", datas.length);
		currentText = datas[curPage];
	});

	//下一页
	let nextPage = vscode.commands.registerCommand('constReadNovel.ReadNovel_nextPage', function () {
		currentText = datas[++curPage];
	});

	//上一页
	let prevPage = vscode.commands.registerCommand('constReadNovel.ReadNovel_prevPage', function () {
		currentText = datas[--curPage];
	});

	//清空注释（老板键）
	let clear = vscode.commands.registerCommand('constReadNovel.ReadNovel_clear', function () {
		currentText = "CONST: The value of a constant can't be changed through reassignment";
	});


	vscode.languages.registerHoverProvider("*", {
		provideHover: async (document, position) => {
			const word = document.getText(document.getWordRangeAtPosition(position));
			if (word === "const") {
				return new vscode.Hover(currentText);
			}
		}
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(nextPage);
	context.subscriptions.push(prevPage);
	context.subscriptions.push(clear);
}


//获取文件类型
function getFileType(filePath) {
	var startIndex = filePath.lastIndexOf(".");
	if (startIndex !== -1) {
		return filePath.substring(startIndex + 1, filePath.length).toLowerCase();
	} else {
		return "";
	}
}

//存储阅读进度
function saveReadProgress() {
	if (!isLegal()) { return; };
	let datas = fileData.split("\r\n");
	if (datas.length === 0) { return; };
	//如果没有记录进度则添加进度
	if (datas[0].indexOf(tipTxt) === -1) {
		let newData = curPage + tipTxt + "\r\n" + fileData;
		writeFile(newData);
	} else { //如果有进度则变更进度
		if (curPage === 0) { return; };
		let savePage = Number(datas[0].split(tipTxt)[0]);
		if (curPage === savePage) { return; };
		let oldLine = savePage + tipTxt + "\r\n";
		let newLine = curPage + tipTxt + "\r\n";
		let newData = fileData.replace(oldLine, newLine);
		writeFile(newData);
	}
}

//检测合法性
function isLegal() {
	if (datas.length === 0 || curPage < 0 || curPage > datas.length) { return false; };
	return true;
}

//写入文件
function writeFile(data) {
	fs.writeFile(filePath, data, { encoding: 'utf8' }, function (err) {
		if (err) { return console.error(err); };
	});
}

//获取阅读进度
function getSavePage(fileData) {
	const datas = fileData.split("\r\n");
	if (datas[0].indexOf(tipTxt) === -1) { return curPage; };
	let savePage = Number(datas[0].split(tipTxt)[0]);
	return savePage;
}

//检测是否空行
function isEmptyLine(str) {
	return str.replace(/[ ]|[\r\n]/g, "") !== "";
}


// 销毁时保存阅读进度
function deactivate() {
	saveReadProgress();
}

module.exports = {
	activate,
	deactivate
};
