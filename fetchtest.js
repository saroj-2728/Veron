const cheerio = require('cheerio')

// For testing
async function getBooksData(roll) {

    try {
        const loginResponse = await fetch('http://pulchowk.elibrary.edu.np/Account/Login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'en-GB,en;q=0.9',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'http://pulchowk.elibrary.edu.np',
                'Referer': 'http://pulchowk.elibrary.edu.np/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Connection': 'keep-alive',
            },
            body: new URLSearchParams({
                Username: roll,
                Password: roll,
            }),
        });

        if (!loginResponse.ok) {
            return {
                success: false,
                message: 'Failed to log in. Please check your roll number.',
            }
        }

        const responseHeaders = {};
        loginResponse.headers.forEach((value, name) => {
            responseHeaders[name] = value;
        });

        console.log('Response Headers:', responseHeaders);

        const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
        console.log('Session Cookie:', cookie);

        console.log(await loginResponse.text())
        if (!cookie) {
            return {
                success: false,
                message: 'Something went wrong. Please try again.',
            }
        }

        const booksResponse = await fetch('http://pulchowk.elibrary.edu.np/Book/BookIssue', {
            method: 'GET',
            headers: {
                Cookie: cookie,
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (!booksResponse.ok) {
            return {
                success: false,
                message: 'Failed to fetch books. Please try again later.',
            }
        }

        const html = await booksResponse.text();

        const $ = cheerio.load(html);
        const books = [];
        $('table tbody tr').each((_, row) => {
            const cols = $(row).find('td');
            books.push({
                accessionNo: $(cols[0]).text().trim(),
                title: $(cols[1]).text().trim(),
                issueDate: $(cols[2]).text().trim(),
                returnDate: $(cols[3]).text().trim(),
                overdue: $(cols[4]).text().trim(),
            });
        });

        return {
            success: true,
            message: books,
        }
    }
    catch (error) {
        console.error(error);
        return {
            success: false,
            message: 'An error occurred while fetching the book list. Please try again later.',
        }
    }
}
(async () => {
    const booksData = await getBooksData("080bct075")
    console.log(booksData);
})()
