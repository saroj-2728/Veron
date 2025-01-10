const cheerio = require('cheerio');
const { Roll } = require('../models/rollNumber.js')

module.exports = {

    async getBooksData(roll) {

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

            const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0];

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
    },

    async checkBookDueDates(client) {
        try {
            const users = await Roll.find();

            for (let user of users) {
                const { userId, roll } = user;

                try {
                    const books = (await module.exports.getBooksData(roll)).message;

                    if (!books || books.length === 0) continue;

                    const overdueBooks = books.filter(book => {
                        if (book.overdue && typeof book.overdue === 'string') {
                            const dueDate = Math.abs(+book.overdue.split(' ')[0]);
                            return !isNaN(dueDate) && dueDate <= 5;
                        }
                        return false;
                    });

                    if (overdueBooks.length > 0) {
                        await module.exports.sendDueDateReminder(client, userId, overdueBooks);
                    }
                }
                catch (error) {
                    console.error(`Error while checking book due dates:`, error);
                }
            }
        }
        catch (error) {
            console.error(`Error processing user ${userId}:`, error.message);
        }
    },

    async sendDueDateReminder(client, userId, books) {
        try {
            const bookDetails = books.map((book, index) => `
            **${index + 1}. Title:** ${book.title}
            **Accession No.:** ${book.accessionNo}
            **Issue Date:** ${book.issueDate}
            **Return Date:** ${book.returnDate}
            **Days Remaining:** ${Math.abs(+book.overdue.split(' ')[0])} days
            `).join(' ');

            const message = `
    Hello <@${userId}>! 📚
    You have books due soon: 
    ${bookDetails} 
    Please make sure to return or renew them on time to avoid penalties.
            `;

            await client.users.send(userId, message);
            console.log(`Reminder sent to user ${userId} about ${books.length} books.`);
        }
        catch (error) {
            console.error(`Failed to send DM to user ${userId}:`, error);
        }
    },


}