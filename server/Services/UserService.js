const bcrypt = require('bcrypt');
const uuid = require('uuid'); 

const dbModel = require('../Models/DB');
const mailService = require('./MailService');
const tokenService = require('./TockenService');

const { error: HttpError } = require('../Exceptions/http-error');

class UserService {
    async register(email, password) {
        const absent = await dbModel.validateEmail(email);
        if (!absent) {
            throw HttpError.badRequest('The email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 3);
        const activationLink = uuid.v4();
        const userId = await dbModel.createUser(email, hashedPassword, activationLink);
        
        await mailService.sendActivationMail(email, `${process.env.API_URL}/api/activate/${activationLink}`);
        const tokens = tokenService.generateToken({ email })
        
        tokenService.updateRefreshToken(userId, tokens.refreshToken);

        return {
            ...tokens,
            user: {
                userId
            }
        }
    }

    async login(email, password) {
        const user = await dbModel.getUser(email);
        console.log('AAAAAA', { user })
        if (!user) {
            throw HttpError.badRequest('The user does not exist');
        } 

        const isPasswordCorrect = await bcrypt.compare(password, user.user_password);
        if (!isPasswordCorrect) {
            throw HttpError.badRequest('Incorrect password');
        }

        const tokens = tokenService.generateToken({ email })
        
        tokenService.updateRefreshToken(user.id, tokens.refreshToken);

        return {
            ...tokens,
            user: {
                userId: user.id
            }
        }
    }

    async activate(activationLink) {
        await dbModel.activateUser(activationLink);
    }
}

module.exports = new UserService();