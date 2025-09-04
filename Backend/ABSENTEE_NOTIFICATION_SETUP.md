# Automated Absentee Notification System

This system automatically sends email notifications to guardians when students don't arrive at school by 9:30 AM.

## Features

- **Automated Daily Checks**: Runs at 9:30 AM every weekday (Monday-Friday)
- **Email Notifications**: Sends professional HTML emails to guardians
- **SMS Notifications**: Optional SMS alerts via Twilio
- **Manual Override**: Admin can manually trigger checks
- **Student Management**: View and manage absent students
- **Notification History**: Track sent notifications
- **Test System**: Test email/SMS functionality
- **Statistics**: View attendance and absentee statistics

## Setup Instructions

### 1. Backend Configuration

#### Email Setup (Gmail)
1. Go to your Gmail account settings
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
4. Update the `.env` file:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

#### SMS Setup (Optional - Twilio)
1. Create a Twilio account at https://www.twilio.com
2. Get your Account SID, Auth Token, and Phone Number
3. Update the `.env` file:
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

#### Timezone Configuration
Add your timezone to the `.env` file:
```env
TIMEZONE=America/New_York
```

### 2. Install Dependencies

The system uses `node-cron` for scheduling. It should already be installed, but if not:

```bash
cd Backend
npm install node-cron
```

### 3. Start the System

```bash
cd Backend
npm start
```

The absentee notification scheduler will automatically start and log:
```
Absentee notification scheduler initialized - will run at 9:30 AM on weekdays
```

## How It Works

### Automatic Process
1. **9:30 AM Daily**: System checks all active students
2. **Compare Attendance**: Identifies students who haven't marked attendance
3. **Send Notifications**: Sends emails/SMS to guardians of absent students
4. **Create Records**: Logs absence records in the database
5. **Update Stats**: Updates student attendance statistics

### Email Template
The system sends professional HTML emails with:
- School branding
- Student details (Name, ID, Class)
- Timestamp of notification
- Guardian information
- Contact instructions
- Responsive design

### Notification Logic
- Only runs on weekdays (Monday-Friday)
- Only sends after 9:30 AM cutoff time
- Prevents duplicate notifications for the same day
- Creates absence records for tracking

## API Endpoints

### Admin Routes (Require Authentication)

#### Get Schedule Information
```
GET /api/absentee/schedule-info
```

#### Manual Absentee Check
```
POST /api/absentee/manual-check
```

#### Get Absent Students
```
GET /api/absentee/absent-students?date=2024-01-15
```

#### Send Custom Notifications
```
POST /api/absentee/send-notification
Body: {
  "studentIds": ["student_id_1", "student_id_2"],
  "customMessage": "Optional custom message"
}
```

#### Get Statistics
```
GET /api/absentee/statistics?startDate=2024-01-01&endDate=2024-01-31
```

#### Test Notifications
```
POST /api/absentee/test-notification
Body: {
  "testEmail": "test@example.com",
  "testPhone": "+1234567890"
}
```

## Frontend Interface

### Absentee Management Page
Located at `/absentee` in the admin dashboard:

- **Schedule Info**: View notification schedule and status
- **Daily Overview**: See absent students for any date
- **Bulk Actions**: Send notifications to multiple students
- **Manual Controls**: Trigger manual checks
- **Test System**: Verify email/SMS functionality
- **Statistics**: View attendance trends

### Features
- Date picker for historical data
- Student selection with checkboxes
- Custom message support
- Real-time loading states
- Success/error notifications
- Responsive design

## Troubleshooting

### Email Issues
1. **Authentication Failed**: Check app password, not regular password
2. **Connection Timeout**: Verify EMAIL_HOST and EMAIL_PORT
3. **Rate Limiting**: Gmail has sending limits (500 emails/day for free accounts)

### SMS Issues
1. **Invalid Phone**: Ensure phone numbers include country code
2. **Twilio Errors**: Check account balance and phone number verification
3. **Rate Limiting**: Twilio has rate limits based on your plan

### Scheduler Issues
1. **Not Running**: Check server logs for initialization messages
2. **Wrong Time**: Verify TIMEZONE environment variable
3. **Weekend Running**: System only runs Monday-Friday

### Database Issues
1. **Connection Errors**: Check MONGODB_URI in .env
2. **Duplicate Records**: System prevents duplicates automatically
3. **Missing Students**: Ensure students have isActive: true

## Customization

### Change Notification Time
Edit `absenteeNotificationService.js`:
```javascript
// Change from 9:30 AM to desired time
const cronExpression = '30 9 * * 1-5'; // Current: 9:30 AM
const cronExpression = '0 10 * * 1-5';  // Change to: 10:00 AM
```

### Modify Email Template
Edit `notificationService.js` → `generateEmailHTML()` method to customize:
- Colors and styling
- Logo and branding
- Content structure
- Additional information

### Add More Notification Methods
Extend the system to support:
- Push notifications
- WhatsApp messages
- Voice calls
- Slack/Teams integration

## Security Considerations

1. **Email Credentials**: Store securely in environment variables
2. **SMS Costs**: Monitor Twilio usage to avoid unexpected charges
3. **Rate Limiting**: Implement appropriate limits for manual triggers
4. **Data Privacy**: Ensure compliance with local data protection laws
5. **Access Control**: Only admins can trigger notifications

## Monitoring

### Logs
The system logs all activities:
- Notification sending attempts
- Success/failure rates
- Error messages
- Scheduler status

### Database Records
- Attendance records for absent students
- Notification status tracking
- Student attendance statistics
- Historical data for reporting

## Best Practices

1. **Test First**: Always test with your own email/phone before going live
2. **Gradual Rollout**: Start with a small group of students
3. **Guardian Communication**: Inform guardians about the new system
4. **Backup Plans**: Have manual notification procedures ready
5. **Regular Monitoring**: Check logs and success rates daily
6. **Data Backup**: Ensure attendance data is backed up regularly

## Support

For technical support or feature requests, check:
1. Server logs for error messages
2. Database connectivity
3. Environment variable configuration
4. Email/SMS service status

The system is designed to be robust and handle failures gracefully, with comprehensive logging for troubleshooting.
