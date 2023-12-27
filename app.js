const express = require("express");
const app = express();

const bcrupt = require("bcrypt");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const path = require("path");

const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
app.use(express.json());
let db = null;

const initializeDB = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("the server running on http://localhost:3000/");
    });
  } catch (e) {
    console.log(`The DB error is:${e.message}`);
    process.exit(1);
  }
};

initializeDB();

const authenticate = (request, response, next) => {
  let jwtToken;
  const autherHeader = request.headers["authorization"];

  if (autherHeader !== undefined) {
    jwtToken = autherHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "USER-SECREAT-KEY", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const Checkquery = `SELECT * FROM user WHERE username='${username}';`;

  let check = await db.get(Checkquery);
  if (check === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordCorrect = await bcrypt.compare(password, check.password);
    if (isPasswordCorrect === true) {
      let payload = {
        username: username,
      };
      const jwttoken = jwt.sign(payload, "USER-SECREAT-KEY");
      response.send({ jwttoken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
const datareturn = (dbObj) => {
  return {
    stateId: dbObj.state_id,
    stateName: dbObj.state_name,
    population: dbObj.population,
    cases: dbObj.cases,
    cured: dbObj.cured,
    active: dbObj.active,
    deaths: dbObj.deaths,
  };
};
app.get("/states/", authenticate, async (request, response) => {
  const getALLquery = `SELECT * FROM state ORDER BY state_id;`;

  let get_all = await db.all(getALLquery);
  response.send(get_all.map((eachState) => datareturn(eachState)));
});

app.get("/states/:stateId/", authenticate, async (request, response) => {
  const { stateId } = request.params;
  let getQuery = `SELECT * FROM state WHERE state_id=${stateId};`;
  let getstate = await db.get(getQuery);
  response.send(datareturn(getstate));
});

app.post("/districts/", authenticate, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const createQuery = `INSERT INTO state(district_name,state_id,cases,cured,active,deaths) VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;

  await db.run(createQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", authenticate, async (request, response) => {
  let { districtId } = request.params;
  let GetQuery = `SELECT * FROM district WHERE district_id=${districtId};`;

  let getDistrict = await db.get(GetQuery);
  response.send(datareturn(getDistrict));
});

app.delete(
  "/districts/:districtId/",
  authenticate,
  async (request, response) => {
    const { districtId } = request.params;
    let deleteQuery = `DELETE FROM district WHERE district_id=${districtId};`;

    await db.run(deleteQuery);
    response.send("District Removed");
  }
);

app.put("/districts/:districtId/", authenticate, async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  let UpdateQuery = `UPDATE district SET district_name='${districtName}', state_id=${stateId}, cases=${cases},cured=${cured}, active=${active}, deaths=${deaths} WHERE district_id=${districtId};`;

  await db.run(UpdateQuery);

  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", authenticate, async (request, response) => {
  const { stateId } = request.params;

  const sum_query = `SELECT SUM(cases),SUM(cured),SUM(active),SUM(deaths)
    FROM district WHERE state_id=${stateId};`;

  const stats = await db.get(sum_query);

  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(stats)"],
    totalDeaths: stats["SUM(stats)"],
  });
});

module.exports = app;
