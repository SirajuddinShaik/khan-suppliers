require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
// const mongoose = require("mongoose");
const _ = require("lodash");
const path = require("path");
// const bcrypt = require("bcrypt");
const { Console, log } = require("console");
const { type } = require("os");
const salts = 10;

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
const mongoose = require("mongoose");
let Authenticated = false;
mongoose
  .connect(process.env.uri)
  .then(() => {
    console.log("Connected to MongoDB Atlas!");
  })
  .then(() => {
    updateDb();
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB Atlas:", error.message);
  });

const securitySchema = mongoose.Schema({
  securityKey: String,
  _id: String,
});

const countSchema = mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    required: true,
  },
});

const itemSchema = mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  TName: {
    type: String,
    required: true,
  },
  EName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
  },
});

const listItemSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    required: true,
  },
});

const listSchema = mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  list: {
    type: [listItemSchema],
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  mobile: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

const Security = mongoose.model("security", securitySchema);
const Item = mongoose.model("item", itemSchema);
const List = mongoose.model("pendinglist", listSchema);
const Counter = mongoose.model("counter", countSchema);
let items = {};
let pending_lists = [];

const updateDb = async () => {
  try {
    const [updatedItems, lists] = await Promise.all([
      Item.find({})
        .then((items) => {
          const updatedItems = {};
          items.forEach((item) => {
            if (item.EName in updatedItems) {
              updatedItems[item.EName].types.push(item.type);
            } else {
              updatedItems[item.EName] = {
                names: [item.EName, item.TName],
                types: [item.type],
              };
            }
          });
          return updatedItems;
        })
        .catch((e) => {
          console.log("Error finding items:", e);
          throw e;
        }),
      List.find({})
        .then((lists) => lists)
        .catch((err) => {
          console.log("Error finding lists:", err);
          throw err;
        }),
    ]);

    // Do something with updatedItems and lists if needed
    items = updatedItems;
    pending_lists = lists;

    // console.log(items);
  } catch (error) {
    console.error("Error:", error);
  }
};

// Usage
updateDb();
app
  .route("/admin")
  .get((req, res) => {
    if (Authenticated) {
      const currentDate = new Date();

      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      thisMonth = pending_lists.filter((i) => {
        let a = i.date.split("-");
        if (a[0] === currentYear + "" && a[1] === currentMonth + "") {
          return true;
        } else {
          return false;
        }
      });
      res.render("home", {
        lists: thisMonth,
        today: { m: currentMonth, y: currentYear },
      });
    } else {
      res.redirect("/");
    }
  })
  .post((req, res) => {
    const list = JSON.parse(req.body.list);
    console.log(list[0]["name"]);
  });
app
  .route("/")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const type = req.body.type;
    const password = req.body.password;
    if (type === "admin" && password === "asd") {
      Authenticated = true;
      res.redirect("/admin");
    } else {
      res.redirect("/");
    }
  });
app.get("/logout", (req, res) => {
  Authenticated = false;
  res.redirect("/");
});
app
  .route("/add-list")
  .get((req, res) => {
    res.render("adder", {
      type: 0,
      items: items,
      items1: JSON.stringify(items),
    });
  })
  .post((req, res) => {
    const list = JSON.parse(req.body.list);
    const customerName = req.body.customerName;
    const eventDate = req.body.eventDate;
    const address = req.body.address;
    const mobile = req.body.mobileNumber;
    console.log(eventDate);
    Counter.findById("pending-list")
      .then((doc) => {
        const found = Counter.findByIdAndUpdate(
          { _id: "pending-list" },
          {
            $set: {
              count: doc.count + 1,
            },
          }
        );
        found.exec();
        if (found) {
          new List({
            _id: doc.count + 1,
            list: list,
            name: customerName,
            date: eventDate,
            address: address,
            mobile: mobile,
          }).save();
        }
      })
      .catch((err) => {
        console.log(err);
      });

    updateDb();
    res.redirect("/add-list");
  });

app
  .route("/home/AddOrUpdate")
  .get((req, res) => {
    res.render("update-add");
  })
  .post((req, res) => {
    const TName = req.body.TName;
    const EName = req.body.EName;
    const type = req.body.itemType;
    const cost = req.body.itemCost;
    if (req.body.operation === "0") {
      Counter.findById("item")
        .then((doc) => {
          const found = Counter.findByIdAndUpdate(
            { _id: "item" },
            {
              $set: {
                count: doc.count + 1,
              },
            }
          );
          found.exec();
          if (found) {
          }
          new Item({
            _id: doc.count + 1,
            TName: TName,
            EName: EName,
            type: type,
            cost: cost,
          }).save();
          console.log("hlo");
        })
        .catch((err) => {
          console.log(err);
        });
    }
  });

app.route("/changepassword").get(function (req, res) {
  res.render("changePW");
});
// .post(function (req, res) {
//   let ch = req.body.type;
//   let username = req.body.username;
//   let currentPass = req.body.currentPass;
//   let newPass = req.body.newPass;
//   let confirmPass = req.body.confirmNewPass;
//   // console.log("suc",newPass,confirmPass);
//   if (newPass === confirmPass) {
//     switch (ch) {
//       case "1":
//         Admin.findOne({ username: username }, function (err, found) {
//           if (found) {
//             bcrypt.compare(
//               currentPass,
//               found.password,
//               function (err1, result) {
//                 if (result) {
//                   bcrypt.hash(newPass, salts, function (err2, hash) {
//                     found.password = hash;
//                     found.save();
//                     res.redirect("/admin/" + found.username);
//                   });
//                 } else {
//                   res.redirect("/changepassword");
//                 }
//               }
//             );
//           } else {
//             res.redirect("/changepassword");
//           }
//         });
//         break;

//       case "2":
//         Counseller.findOne({ username: username }, function (err, found) {
//           if (found) {
//             bcrypt.compare(
//               currentPass,
//               found.password,
//               function (err1, result) {
//                 if (result) {
//                   bcrypt.hash(newPass, salts, function (err2, hash) {
//                     found.password = hash;
//                     found.save();
//                     res.redirect("/counseller/" + found.username);
//                   });
//                 } else {
//                   res.redirect("/changepassword");
//                 }
//               }
//             );
//           } else {
//             res.redirect("/changepassword");
//           }
//         });
//         break;

//       case "3":
//         Student.findOne({ username: username }, function (err, found) {
//           if (found) {
//             bcrypt.compare(
//               currentPass,
//               found.password,
//               function (err1, result) {
//                 if (result) {
//                   bcrypt.hash(newPass, salts, function (err2, hash) {
//                     found.password = hash;
//                     found.save();
//                     res.redirect("/student/" + found.username);
//                   });
//                 } else {
//                   res.redirect("/changepassword");
//                 }
//               }
//             );
//           } else {
//             res.redirect("/changepassword");
//           }
//         });
//         break;

//       default:
//         res.redirect("/changepassword");
//         break;
//     }
//   } else {
//     res.redirect("/changepassword");
//   }
// });
app
  .route("/admin/bill/:billno")
  .post((req, res) => {})
  .get((req, res) => {
    var bill;
    var details;
    const billNo = req.params.billno;
    List.findById(billNo)
      .then((doc) => {
        details = {
          billNo: doc._id,
          address: doc.address,
          mobile: doc.mobile,
          date: doc.date.split("-").reverse().join("-"),
          name: doc.name,
        };
        bill = [];
        total = 0;

        // Create an array of promises
        const promises = doc.list.map((i) => {
          let names = i.name.split("-");
          return Item.find({ EName: names[0], type: i.type })
            .then((found) => {
              let data = [
                names[0],
                names[1],
                i.type,
                i.count * found[0].cost,
                i.count,
                found[0].cost,
              ];
              total = total + i.count * found[0].cost;
              bill.push(data);
            })
            .catch((err) => {
              console.log(err);
            });
        });

        return Promise.all(promises);
      })
      .then(() => {
        console.log(bill);
        console.log(details);
        res.render("bill", {
          language: 1,
          details: details,
          bill: bill,
          total: total,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });

app.route("/admin/:billno").get((req, res) => {
  const billNo = req.params.billno;
  List.find({ _id: billNo }).then((docs) => {
    res.render("adder", {
      type: 1,
      details: JSON.stringify(docs),
      items: items,
      items1: JSON.stringify(items),
      billno: billNo,
    });
  });
});

app.listen(3000, function () {
  console.log("Server live at port:3000");
});
