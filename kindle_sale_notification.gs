const sheet_id = "1mW6Ogtwo_OI6vXW5_epuZmvvgfyCj5g2CahkhazjPjs";
const sheet_name = "シート1"
const rss_url = "https://yapi.ta2o.net/kndlsl/index.rss";
const webhook_url = "***";

// entry point
function main() {
  let sheet = SpreadsheetApp.openById(sheet_id).getSheetByName(sheet_name);
  const old_rows = loadSheet(sheet);
  const feeds = getFeeds();
  const new_data = compare(old_rows, feeds);
  writeSheet(sheet, feeds);
  if (new_data.length != 0) {  
    notifySlack(new_data);
  }
}

function loadSheet(sheet) {
  const lastRow = sheet.getDataRange().getLastRow()
  const data = sheet.getRange(1, 1, lastRow, 3).getValues()
  return data;
}

function getFeeds() {
  let response = [];
  let xml = UrlFetchApp.fetch(rss_url).getContentText();
  let document = XmlService.parse(xml);
  let rss = XmlService.getNamespace("http://purl.org/rss/1.0/");
  let rdf = XmlService.getNamespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
  let root = document.getRootElement();

  let channel = root.getChild("channel", rss);
  let title = channel.getChild("title", rss).getText();
  let link = channel.getChild("link", rss).getText();
  let description = channel.getChild("description", rss).getText();
  let items = root.getChildren("item", rss);

  for (let item of items) {
    let title = item.getChild("title", rss).getText();
    let link = item.getChild("link", rss).getText();
    let description = item.getChild("description", rss);
    response.push([title, link, description]);
  }
  return response;
}

function compare(old_rows, feeds) {
  const result = [];
  for (let feed of feeds) {
    let isNew = true;
    for (let old_row of old_rows) {
      if (old_row[1] === feed[1]) {
        isNew = false;
        break;
      }
    }
    if (isNew) {
      result.push(feed)
    }
  }
  return result;
}

function writeSheet(sheet, feeds) {
  // クリア
  sheet.clearContents();
  // 書き込み
  for (let feed of feeds) {
    sheet.appendRow([...feed]);
  }
}

function notifySlack(data) {
  const userName = "GASくん"
  const icon     = ":google_apps_script:"
  let message  = "kindleから新しいセールのお知らせです！"

  for(let item of data) {
    message += "\n\n・" + item[0] + "\n" + item[1];
  }

  let jsonData = {
    "username": userName,
    "icon_emoji": icon,
    "text": message
  }

  let payload = JSON.stringify(jsonData)

  let options = {
    "method": "post",
    "contentType": "application/json",
    "payload": payload
  };

  UrlFetchApp.fetch(webhook_url, options);
}