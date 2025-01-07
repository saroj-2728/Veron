const cheerio = require('cheerio');
const client = require('../index.js');

let users = [];

module.exports = {
    users,

    addUser(userId, roll) {
        users.push({ userId, roll });
    },

    async getBooksData(roll) {

        try {
            const loginResponse = await fetch('http://pulchowk.elibrary.edu.np/Account/Login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    Username: roll,
                    Password: roll,
                }),
            });

            if (!loginResponse.ok) {
                return {
                    success: false,
                    message: 'Failed to log in. Please check your roll number.'
                }
            }

            const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0];

            if (!cookie) {
                return {
                    success: false,
                    message: 'Login successful, but session cookie not found. Please try again.'
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
                    message: 'Failed to fetch books. Please try again later.'
                }
            }

            const html = await booksResponse.text();
            console.log(html);

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
                message: books
            }
        }
        catch (error) {
            console.error(error);
            return {
                success: false,
                message: 'An error occurred while fetching the book list. Please try again later.'
            }
        }
    },

    async checkBookDueDates() {
        for (let user of users) {
            const { userId, roll } = user;

            try {
                const books = (await module.exports.getBooksData(roll)).message;
                console.log(books)
                if (!books || books.length === 0) continue;

                for (const book of books) {
                    if (book.overdue && typeof book.overdue === 'string') {
                        const dueDate = Math.abs(+book.overdue.split(' ')[0]);

                        if (!isNaN(dueDate) && dueDate <= 85) {
                            await module.exports.sendDueDateReminder(userId, book);
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error processing user ${userId}:`, error.message);
            }
        }
    },

    async sendDueDateReminder(userId, book) {
        try {

            const message = `
    Hello! 📚
    You have a book due soon:
    
    **Title:** ${book.title}
    **Accession No.:** ${book.accessionNo}
    **Issue Date:** ${book.issueDate}
    **Return Date:** ${book.returnDate}
    **Days Remaining:** ${Math.abs(+book.overdue.split(' ')[0])} days
    
    Please make sure to return or renew it on time to avoid penalties.
            `;

            // Send the DM to the user
            await client.users.send(userId, message);
            console.log(`Reminder sent to user ${userId} about the book "${book.title}".`);
        } 
        catch (error) {
            console.error(`Failed to send DM to user ${userId}:`, error);
        }
    }

}