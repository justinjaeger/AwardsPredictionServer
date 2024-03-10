/**
 * To run:
 * node packages/functions/src/dev/getDateForStorage.js
 *
 * Helpful for getting dates based on EST date/times
 * and logging the correct date in UTC (which should be stored)
 */
const EST_TIME = '19:00:00'; // if >12, then will be PM
const EST_DATE = 'Mar 10 2024';
const date = new Date(`${EST_DATE} ${EST_TIME}`);

const invdate = new Date(
  date.toLocaleString('en-US', {
    timeZone: 'EST'
  })
);

const diff = date.getTime() - invdate.getTime();

const utcDate = new Date(date.getTime() - diff); // needs to substract

// confirm that values are correct:
console.log('Confirm this is correct:');
console.log(utcDate.toString()); // 08:00:00 GMT+0500 (Eastern Universal Time)
console.log('Paste this in mongodb:');
console.log(utcDate); // 2024-01-23T13:00:00.000Z
