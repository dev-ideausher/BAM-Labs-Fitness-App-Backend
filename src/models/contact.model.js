const mongoose = require('mongoose');
const { paginate } = require('./plugins/paginate');

const supportRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  user:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ticketNo:{
    type:Number,
},
  email: {
    type: String,
    required: true,
    trim: true,
  },
  query: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Open', 'In_progress', 'Closed'],
    default: 'Open',
  },

}, {timestamps: true});


// generate unique user Id
function generateUID() {
    const timestamp = Date.now() % 10000; // Last 4 digits of current timestamp
    const random = Math.floor(Math.random() * 10000); // Random 4-digit number
    return Number(`${timestamp}${random.toString().padStart(4, '0')}`);
}
// hook to generate userID
supportRequestSchema.pre('save', async function(next) {
    if (!this.ticketNo) {
      let ticketNumber;
      let existingNo;
      do {
        ticketNumber = generateUID();
        existingNo = await ContactUs.findOne({ ticketNo: ticketNumber });
      } while (existingNo);
      
      this.ticketNo = ticketNumber;
    }
    next();
  });

supportRequestSchema.plugin(paginate);

const ContactUs = mongoose.model('SupportRequest', supportRequestSchema);

module.exports = {ContactUs};
