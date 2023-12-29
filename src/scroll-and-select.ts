import { firefox, BrowserContext, Page } from 'playwright';

const selectionYears = Array.from({ length: 2023 - 2005 + 1 }, (_, index) => 2005 + index);
const selectionUrls = selectionYears.map(year => `https://www.amazon.com/photos/all?timeYear=${year}`);

type Credentials = {
  email: string;
  password: string;
};

const login = (page: Page) => ({ email, password }: Credentials)=>
  page.waitForSelector('#ap_email')
    .then(() => page.click('#ap_email'))
    .then(() => page.waitForSelector('#ap_email:not([disabled])'))
    .then(() => page.type('#ap_email', email))
    .then(() => page.waitForSelector('#ap_email'))
    .then(() => page.keyboard.press('Tab'))
    .then(() => page.waitForSelector('#ap_password:not([disabled])'))
    .then(() => page.type('#ap_password', password))
    .then(() => page.waitForSelector('[name="rememberMe"]'))
    .then(() => page.click('[name="rememberMe"]'))
    .then(() => page.waitForSelector('#signInSubmit'))
    .then(() => Promise.all([page.click('#signInSubmit'), page.waitForLoadState()]));


const selectSectionsLogic = (headers) =>
  headers.reduce((count, header) => {
    const countSelectButton = header.querySelector('.count-select');
    if (countSelectButton && !countSelectButton.classList.contains('active')) {
      countSelectButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    return count + 1;
  }, 0);

  
  const selectSectionsNative = () => 
  selectSectionsLogic(Array.from(window.document.querySelectorAll('.section-header')));

  selectSectionsNative()
  
  const selectSectionsPW = (page: Page) => page.$$eval('.section-header', selectSectionsLogic);

const scrollAndSelectOld = (selectFn: (document: Document) => number) => (document: Document) =>{  
    const scrollPage = () => {
        const window = document.defaultView 
        
        if (!window) {
            console.error('window is not available')
            return;
        }

        const {scrollHeight, clientHeight, scrollTop } = document.documentElement;

        window.scrollBy(0, Math.ceil(window.innerHeight * 0.5));
        selectFn(document);
        
        if (Math.abs(scrollHeight - clientHeight - scrollTop) > 1) {
        setTimeout(scrollPage, 100);
        } 
    };
    scrollPage();
};



// returns the vertical distance between the bottom of the scrollable content and the bottom of the viewport
const scrollDown = (document: Document): number => {
  const window = document.defaultView;
  if (window) {
    window.scrollBy(0, Math.ceil(window.innerHeight * 0.5));
  }
  const { scrollHeight, clientHeight, scrollTop } = document.documentElement;
  return Math.abs(scrollHeight - clientHeight - scrollTop);
}

const scrollToBottomLogic = (document: Document): boolean => 
  scrollDown(document) > 0 
     ? !!setTimeout(()=> scrollToBottomLogic(document), 100)
     : true
const scrollToTop = () => {
    window.scrollTo(0, 0);
}

const scrollALlWithAction = (action: (document: Document) => number) => (document: Document) => {  
  scrollToTop()

  const down = (doc) => {
    action(doc);

    return scrollDown(doc) > 0 
      ? !!setTimeout(()=> down(doc), 100)
      : true
    }
  return down(document)
}

