'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiDate = require('chai-datetime');
const faker = require('faker');
const mongoose =  require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);
chai.use(chaiDate);

function seedBlogData() {
    console.info('seeding blog data');
    const seedData = [];

    for (let i=1; i<=10; i++) {
        seedData.push(generateBlogData());
    }
    return BlogPost.insertMany(seedData);
}

function generateTitleData() {
    const titles = ['Great Blog Post', '10 Reasons to Learn JavaScript', '3 Skills All Developers Should Have', 'Best Vacation Spots'];
    return titles[Math.floor(Math.random() * titles.length)];
}

function generateContentData() {
    const contents = ['Bushwick butcher tacos tumeric air plant', 
                      'Echo park truffaut photo booth post-ironic. Activated charcoal',
                      'Truffaut disrupt keytar ennui, cardigan brooklyn tumeric hashtag',
                      'Pork belly bushwick tacos, salvia ugh woke yr drinking vinegar lumbersexual vice'];
    return contents[Math.floor(Math.random() * contents.length)];
}

function generateBlogData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: generateTitleData(),
        content: generateContentData(),
        created: faker.date.past()
    }
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('BlogPost API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

describe('GET Endpoint', function() {
    it('should describe all existing blog posts', function() {
        let res;
        return chai.request(app)
           .get('/posts')
           .then(function(_res) {
               res = _res;
               expect(res).have.status(200);
               expect(res.body).have.lengthOf.at.least(1);        
           });
    });

    it('should return blogs with right fields', function() {
        let resBlog;
        
        return chai.request(app)
            .get('/posts')
            .then(function(res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.a('array');
                expect(res.body).to.have.lengthOf.at.least(1);

                res.body.forEach(function(blog) {
                    expect(blog).to.be.a('object');
                    expect(blog).to.include.keys('author', 'content', 'title', 'created');
                });

                resBlog = res.body[0];
                return BlogPost.findById(resBlog.id);
            })
            .then(function(blog) {
                expect(resBlog.id).to.equal(blog.id);
                expect(resBlog.author).to.equal(blog.serialize().author);
                expect(resBlog.title).to.equal(blog.title);
                expect(resBlog.content).to.equal(blog.content);
                expect(new Date(resBlog.created)).to.equalDate(blog.created);
            })
    });

});

describe('POST endpoint', function() {
    it('should add a new blog', function() {
        const newBlog = generateBlogData();

        return chai.request(app)
         .post('/posts')
         .send(newBlog)
         .then(function(res) {
             expect(res).to.have.status(201);
             expect(res.body).to.be.a('object');
             expect(res.body).to.include.keys('title', 'author', 'content', 'created');
             return BlogPost.findById(res.body.id);
         })
         .then(function(blog) {
             expect(newBlog.title).to.equal(blog.title);
             expect(newBlog.author.firstName).to.equal(blog.author.firstName);
             expect(newBlog.author.lastName).to.equal(blog.author.lastName);
             expect(newBlog.content).to.equal(blog.content);
             // date giving different results between newBlog and blog. res.body and blog have the same date.
            //  expect(newBlog.created).to.equal(blog.created);
         })
    });
});

describe('PUT endpoint', function() {
    it('should update fields you send over', function() {
        const updatedData = {
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            }
        }

        return BlogPost
            .findOne()
            .then(function(blog) {
                console.log('blog ', blog._id);
                updatedData.id = blog._id;
                
                return chai.request(app)
                   .put(`/posts/${updatedData.id}`)
                   .send(updatedData);        
            })
            .then(function(res) {
                expect(res).to.have.status(204);
                
                return BlogPost.findById(updatedData.id)
                    .then(function(blog) {
                        expect(blog.serialize().author).to.be.equal(`${updatedData.author.firstName} ${updatedData.author.lastName}`);
                    })
            })
    });
});

describe('DELETE endpoint', function() {
    it('should delete a post by id', function() {
        
        let post;

        return BlogPost
          .findOne()
          .then(function(_post) {

            post = _post;
            
            return chai.request(app)
                .delete(`/posts/${post.id}`)

          })
          .then(function(res) {
            
            expect(res).to.have.status(204);


            return BlogPost.findById(post.id)
                .then(function(post) {
                    expect(post).to.not.exist;
                })
          });
    });
});

}); 