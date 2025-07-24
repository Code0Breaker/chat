import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body() createMessageDto) {
    return this.messagesService.create(createMessageDto);
  }

  @Get(':id')
  findAll(@Param('id') id: string) {
    return this.messagesService.findAllUnread(id);
  }

  @Patch()
  update(@Body('ids') ids: string[]) {
    console.log('Updating message status for IDs:', ids);
    return this.messagesService.update(ids);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.messagesService.remove(+id);
  }
}
