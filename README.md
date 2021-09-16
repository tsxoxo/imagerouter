# Mapper 

**See local photos from any spot in the world**

---

>   *DISCLAIMER: This is Tom Szwaja writing. The other contributor to this repo - [João Santos](https://github.com/JoMiguelSantos) -  was my teammate on this project and does not necessarily agree with the views expressed here, etc.*

### General Idea

This app lets you pick a spot on a world map and shows you local photos from around there. The map data comes from Google Maps, the photos from Flickr.

Together with [João Santos](https://github.com/JoMiguelSantos), we made this for our final project of the full stack web development bootcamp at [SPICED Academy](https://www.spiced-academy.com/en). 

Read about how it went in the [Development Story](#development-story) section, below!

---

### Features

*   Pick any spot on a world map
*   See photos from around there

---

### Stack

*   [React](https://reactjs.org/)
*   [Material-UI](https://material-ui.com/) - A library of React components based on Google's [Material Design](https://material.io/).
*   [React-google-maps](https://www.npmjs.com/package/react-google-maps) - A React wrapper for Google Maps
*   [Node](https://nodejs.org/en/about/)
*   [Express](http://expressjs.com/)
*   [PostgreSQL](https://www.postgresql.org/about/)

*   The [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview) (via the react-google-maps wrapper)
*   The [Flickr API](https://www.flickr.com/services/api/)

---

<a id="development-story"> </a>

### Development Story

#### Background 

This was the final project of our coding bootcamp. After 11 weeks of learning about Node, SQL and React, we were sent out into the wild to put our skills to the test.

I was up for building something big and cool, which to me meant it had to include internet APIs, libraries, and Material Design. I loved the idea of taking stuff that was out there and combining it into something new.

I also wanted to do this in a team. Coding alone was getting kind of stale. So when João told me that he had an idea, and it was big enough for two, everything just fell into place. 

This project would use different APIs, probably some API wrappers, and offered more than enough challenges with its scope, on the front as well as the back end. Unlike in other apps, you would be able to pick any spot on the map, not just the ones that have a name. This was really about the nooks and crannies of the world. I was excited.

#### Process

We started by organising the workload and breaking it down into tasks. A Trello board in Kanban fashion would serve as our road map. Thanks to João's experience in programming and organizing such projects, we were off to a running start.

As for the division of labor, the back end would be João's domain, while I took care of the front and managed the internet APIs. Our interests complemented each other nicely.  

We ran into the kind of challenges that by the end of the bootcamp I started recognizing as typical in a coding project. Performance had to be optimized and API documentation had to be cursed repeatedly. João performed feats of database-magic on the back end. Towards the end, he discovered a security issue which unfortunately prevented us from deploying. 

A lot of cool ideas had to be declared non-essential, as we wanted to make sure we got the core feature of `click map - get pictures` working in a presentable way. 

#### Review

Thanks in part to this focus, after a week we had what we wanted, and presented Mapper to our captive audience. Good work, us! 

I see several things contributing to this outcome: we both liked to work in a structured way and made good use of the Kanban method; our vision for the final product was similar; and our interests in what we wanted to explore within this project were complementary, so there was very little conflict. 

I am very satisfied with the overall process and the result. It all felt fairly new to me at the time: working with an API wrapper, handling this amount of data, solving Git merge issues... But beyond practicing technical skills, I also saw how a little planning and structure in the beginning could go a long way towards keeping focus, reducing stress and ultimately producing better results. 

In all of these areas, I benefitted a lot from João. Thank You for a valuable experience. I learned a lot on this project. 
