import { firefox, chromium, Page } from "playwright";
import gaxios from "gaxios";
import fs from "fs";

type Credentials = {
  email: string;
  password: string;
};

type ObjOfArrays = {
  [key: string]: unknown[];
};

const flattenMerge = (arr: ObjOfArrays[]): ObjOfArrays =>
  arr.reduce((mergedObj, obj) => {
    if (Object.keys(obj).length === 0) {
      return mergedObj;
    }
    Object.keys(obj).forEach((key) => {
      mergedObj[key] = (mergedObj[key] || []).concat(obj[key]);
    });
    return mergedObj;
  }, {});


type searchPayload = {
  data: unknown[];
  aggregations: unknown;
  count: number;
};

const searchAll = (headers: {}) => {
  console.log("searching for photos and videos");
  const searchParams = {
    asset: "NONE",
    ContentType: "JSON",
    filters: "type:(PHOTOS OR VIDEOS)",
    limit: "200",
    lowResThumbnail: "false",
    resourceVersion: "V2",
    searchContext: "customer",
    sort: "['contentProperties.contentDate DESC']",
    tempLink: "false",
  };
  gaxios.instance.defaults = {
    baseURL: "https://www.amazon.com/drive/v1/",
    params: searchParams,
    timeout: 3000,
    url: "search/",
    headers: headers || {},
  };

  const accRecords: unknown[] = [];
  const accAggregations: unknown[] = [];
  const search = (offset: number): Promise<searchPayload> =>
    gaxios
      .request({ params: { ...searchParams, offset: offset.toString() } })
      .then(async (response) => {
        const { count, data, aggregations } = response.data as searchPayload;
        // const count = 300; // set it lower for testing rather than get it from response.data
        accRecords.push(...data);
        accAggregations.push(aggregations);
        await new Promise((resolve) => {
          setTimeout(resolve,100);
        });
        return accRecords.length < count
          ? search(accRecords.length)
          : { data: accRecords, aggregations: accAggregations[0], count };
      })
      .catch((error: Error) => {
        throw error;
      });

  return search(0);
};

const appConfigDefaults = {
  downloadFolder: "~/",
  rootUrl: "https://www.amazon.com/photos/all/",
};

const settings = appConfigDefaults;

const pwConfig = {
  devtools: true,
  headless: false,
  downloadsPath: settings.downloadFolder,
};

(async () => {
  const browser = await chromium.launch(pwConfig);
  const context = await browser.newContext();

  const cookiesPath = "./cookies.json";
  const cookiesExist = await fs.existsSync(cookiesPath);

  if (cookiesExist) {
    const cookies = JSON.parse(await fs.readFileSync(cookiesPath, "utf-8"));
    await context.addCookies(cookies);
  }

  const page = await context.newPage();
  await page.goto(settings.rootUrl);
  await page.getByLabel("Keep me signed in").click();
  await page
    .getByLabel("Email or mobile phone number ")
    .fill("!!!USERNAME!!!");
  await page.getByLabel("Password").fill("!!!PASSWORD!!!");
  await page.getByRole("button", { name: "Sign in" }).click();

  let lastestHeaders;
  let searchResults;

  page.on("request", async (request) => {
    if (request.url().includes("drive/v1/search?asset=ALL") 
           && Object.hasOwn(request.headers(), "x-requested-with")) {
            lastestHeaders = {...request.headers(), cookie: (await request.allHeaders())['cookie']};
            console.log(lastestHeaders);
    };
  });

  do {
    if (lastestHeaders !== undefined) {
      console.log('yeh, headers')
      searchResults = await searchAll(lastestHeaders);
    } else {
      console.log("waiting for headers...");
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  } while (searchResults === undefined);

  
  fs.writeFileSync('./search-results.json', JSON.stringify(searchResults))
  console.log(searchResults);

  await browser.close();


})();
