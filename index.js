const express = require('express')
const bodyParser = require('body-parser')

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const prisma = new PrismaClient()
const jwt = require('jsonwebtoken');

const app = express()


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const port = 3000;

app.get('/michu', (req, res) => {
  res.send('Hello World!');
});

// app.get('/theatres', async (req, res) => {
//   const theatres = await prisma.theatres.findMany()
//   res.json(theatres)
// });


app.post('/register', async (req, res) => {
  const { username, email, password, is_admin } = req.body
  try{
  // hash the password
  const user= await prisma.users.findFirst({
    where: {
      email: email,
    },
  })
  if(user){
    return res.status(400).json({error: "User already exists"})
  }
  const hashedPassword = await bcrypt.hash(password, 10)
  // create user
  const newuser = await prisma.users.create({
    data: {
      username,
      email,
      is_admin,
      password: hashedPassword,
    },
  })
  const responseObject = {
    id: newuser.id,
    email: newuser.email,
    username: newuser.username
  };
  return res.json(responseObject);
}catch(error){
  console.log(error)
  return res.status(400).json({error: "Something went wrong"})
}
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Retrieve user from the database
    const user = await prisma.users.findFirst({ where: { email:email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare provided password with hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user.id }, 'michu', { expiresIn: '36h' });

    res.status(200).json({ message: 'Login successful', token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});



function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  jwt.verify(token, 'michu', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.userId = decoded.userId;
    next();
  });
}

// Protected route example
app.get('/protected', verifyToken, (req, res) => {
  console.log(req.userId);
  res.status(200).json({ message: 'Protected route accessed' });
});

app.post('/michu', (req, res) => {
  console.log(req.body);
  res.send('Hello World!');
});
//get single theatre
app.get('/theatres/:id',verifyToken, async(req, res) => {
  const id = parseInt(req.params.id)
  const theatre = await prisma.theatres.findUnique({
    where: {
      id: id,
    },
  })
  return res.json(theatre)
})
// get all theatres
app.get('/theatres',verifyToken, async(req, res) => {
  const theatre = await prisma.theatres.findMany()

  return res.json(theatre)
})
// get all shows of a theatre
app.get('/:theatre_id/shows',verifyToken, async(req, res) => {
  const theatre_id = parseInt(req.params.theatre_id)
  const movie = await prisma.shows.findMany({
    where:{
      theatre_id: theatre_id
    }
  })
  return res.json(movie)
})
//get a show
app.get('/:theatre_id/shows/:show_id',verifyToken, async(req, res) => {
  // console.log(req.params)
  const theatre_id = parseInt(req.params.theatre_id)
  const show_id = parseInt(req.params.show_id)
  const movie = await prisma.shows.findMany({
    where:{
      theatre_id: theatre_id,
      id: show_id,
    }
  })
  return res.json(movie)
})
// edit a show
app.put('/:theatre_id/shows/:show_id', verifyToken, async (req, res) => {
  const theatre_id = parseInt(req.params.theatre_id);
  const show_id = parseInt(req.params.show_id);
  const { title, description, show_time, price } = req.body;

  try {
    const show = await prisma.shows.update({
      where: {
        theatre_id: theatre_id,
        id: show_id,
      },
      data: {
        title: title,
        description: description,
        show_time: show_time,
        price: price, // You should define `price` or remove it if not needed.
      },
    });

    // Return a success response
    res.status(200).json({ message: 'Show updated successfully', show: show });
  } catch (error) {
    // Handle the error here
    console.error('Error updating show:', error);
    res.status(500).json({ message: 'An error occurred while updating the show' });
  }
});


// get all theatres by an admin
app.get('/admin/theatres/:user_id',verifyToken, async(req, res) => {
  const user_id = parseInt(req.params.user_id)
  const theatre = await prisma.theatres.findMany({
    where:{
      user_id: user_id
    }
  })
  return res.json(theatre)
})

//edit a theatre
app.put('/admin/theatres/:theatre_id', verifyToken, async (req, res) => {
  const theatre_id = parseInt(req.params.theatre_id);
  const { title, caption, city, image_url } = req.body;

  try {
    const theatre = await prisma.theatres.update({
      where: {
        id: theatre_id,
      },
      data: {
        title: title,
        caption: caption,
        city: city,
        image_url: image_url,
      },
    });

    // Return the updated theatre as a response
    res.json(theatre);
  } catch (error) {
    // Handle the error here
    console.error('Error updating theatre:', error);
    res.status(500).json({ message: 'An error occurred while updating the theatre' });
  }
});


// delete a theatre
app.delete('/admin/theatres/:theatre_id',verifyToken, async(req, res) => {
  const theatre_id = parseInt(req.params.theatre_id)
  const theatre = await prisma.theatres.delete({
    where:{
      id: theatre_id
    }
  })
  return res.json(theatre)
})


//create a show
app.post('/admin/theatres/:theatre_id/shows', verifyToken, async (req, res) => {
  const theatre_id = parseInt(req.params.theatre_id);
  const { title, description, date_time, price, capacity } = req.body;
  console.log(req.body)

  try {
    const show = await prisma.shows.create({
      data: {
        title: title,
        description: description,
        date_time: date_time,
        price: price,
        theatre_id: theatre_id,
      },
    });

    // Create or update ShowTickets entry
    let showTicket = await prisma.show_tickets.findFirst({
      where: {
        show_id: show.id,
      },
    });

    if (showTicket) {
      // Update existing entry
      showTicket = await prisma.show_tickets.update({
        where: {
          id: showTicket.id,
        },
        data: {
          tickets_available: capacity,
        },
      });
    } else {
      // Create new entry
      showTicket = await prisma.show_tickets.create({
        data: {
          show_id: show.id,
          tickets_available: capacity,
        },
      });
    }

    // Return the created show as a response
    res.json({
      message: 'Show created successfully.',
      show_id: show.id,
      showTicket: showTicket,
    });
  } catch (error) {
    // Handle the error here
    console.error('Error creating show:', error);
    res.status(500).json({ message: 'An error occurred while creating the show' });
  }
});


// edit a show
app.put('/admin/theatres/shows/:show_id',verifyToken, async(req, res) => {
  const show_id = parseInt(req.params.show_id)
  const {title, description,date_time,price} = req.body
  const show = await prisma.shows.update({
    where:{
      id: show_id
    },
    data:{
      title: title,
      description: description,
      date_time: date_time,
      price: price,
    }
  })
  return res.json(show)
})

// delete a show
app.delete('/admin/theatres/shows/:show_id',verifyToken, async(req, res) => {
  const show_id = parseInt(req.params.show_id)
  const show = await prisma.shows.delete({
    where:{
      id: show_id
    }
  })
  return res.json(show)
})

// get show details
app.get('/admin/theatres/shows/:show_id',verifyToken, async(req, res) => {
  const show_id = parseInt(req.params.show_id)
  const show = await prisma.show_tickets.findUnique({
    where:{
      show_id: show_id
    }
  })
  return res.json(show)
})
























app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

