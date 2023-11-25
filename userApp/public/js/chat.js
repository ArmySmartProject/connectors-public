'use strict';

$(document).ready(function () {

  let chatbotMonitor;
  let lastTalk = {};
  let curRoomId;
  let roomUUIDMap = [];

  // [ predefined variables ]
  // serverURL, userType, userId, userOption,
  // csService, csCategory, firstQuestion
  console.log('[user type] : ' + userType);
  console.log('[user id]   : ' + userId);

  // socket client for TALKING
  let socketClient = new SocketClient(userType, userId);
  socketClient.setEventListeners(writeMessage, writeChatList, handleChatEndUI,
      writePreviousMessages);

  // 임시 소스 for GCS
  if (typeof userOption !== "undefined" && userOption === 'gcs') {
    roomUUIDMap = [];
    // socket client for CHATBOT MONITORING
    chatbotMonitor = new ChatbotMonitorSocket(userType, userId);
    chatbotMonitor.setEventListeners(writeMessage, writeChatList);

    // (gcs/supporter용) 상담개입 버튼
    $('#joinRoom_btn').click(function () {
      console.log('(gcs) 상담개입:' + curRoomId);
      if (curRoomId) {
        socketClient.joinRoom(curRoomId).then(data => {
          // message 입력창 활성화
          $('#connect_wrap .cschat_btm #user_message_input').attr('disabled',
              false);
        })
        .catch(function (err) {
          console.log(err); // Error: Request is failed
        });
      }
    });

    // (gcs/supporter용) 상담종료 버튼
    $('#endChat_btn').click(function () {
      console.log('(gcs) 상담종료:' + curRoomId);
      if (curRoomId) {
        socketClient.endUserChat(curRoomId);
        // message 입력창 비활성화
        $('#connect_wrap .cschat_btm #user_message_input').attr('disabled',
            true);
      }
    });

    getAvailableRoomList();
  }

  // user용 실행 함수 : room 생성 및 chat window 활성화
  function createUserRoom() {
    let bot = true;
    if (supportType === 'supporter') {
      bot = false;
    }
    socketClient.createNJoinRoom(bot, csService, csCategory).then((data) => {
      openChatWindow(data.roomId, csService, data.userId,
          data.previousMsg, firstQuestion);
    });
  }

  if (userType === 'user') {
    createUserRoom();
  }

  // 채팅방 내 '대화시작'으로 대화 시작할 시 실행 함수
  function startConversation() {
    // 일단은 시연을 위해 bot을 true로
    socketClient.createNJoinRoom(true, csService, csCategory).then((data) => {
      socketClient.startChat(data.roomId);
    });

    // 상담 시작 버튼 hide
    $('.each_chatout .btn_fill').addClass('hide');
    // 하단 menu, input 창 show
    $('.cschat_btm').removeClass('hide');
  }

  // Chat window 열기 함수
  function openChatWindow(roomId, csService = '', clientId = '',
      previousMsgs = undefined, openMsg = '') {
    console.log('[OPEN CHAT WINDOW] current room id: ' + roomId);
    curRoomId = roomId;

    if (socketClient.userType === 'supporter') {
      $('#connect_wrap .cschat_btm #user_message_input').attr('disabled', true);

      // show user info
      $('div ul#chat_user_info .csService em').text(csService);
      $('div ul#chat_user_info .customerName em').text(clientId);
    }
    $("#connect_wrap").show();

    if (!previousMsgs) {
      // callback -> writePreviousMessages
      socketClient.getPreviousMsgs(roomId);
    } else {
      writePreviousMessages(roomId, previousMsgs);
    }

    if (openMsg !== '') {
      sendMessage(openMsg);

      // 상담 시작 버튼 hide
      $('.each_chatout .btn_fill').addClass('hide');
      // 하단 menu, input 창 show
      $('.cschat_btm').removeClass('hide');
    }
    // scroll to top
    handleCsTalkScroll();

    // all read 처리
    socketClient.readAllMsgs(roomId);
  }

  // (test용)상담 시작 버튼 in supporter
  $('.supporter_test_btn').click(getAvailableRoomList);

  // 상담사로 전환 button
  $('.dialog_change .btn_confirm').click(transferToAgent);

  // 채팅 종료 button
  $('.dialog_chatout .btn_confirm').click(endChat);

  // get room list from server
  function getAvailableRoomList() {
    socketClient.getAvailableRooms();
  }

  // 상담사로 전환
  function transferToAgent() {
    socketClient.transferToAgent();
    $('.cschat_btm .menu_open').click();
  }

  // 채팅 종료
  function endChat() {
    socketClient.endChat(curRoomId);
    // handleChatEndUI();
  }

  // 채팅방 리스트 출력: 임시 소스 for GCS
  function writeChatList(rooms, option = 'av_rooms') {
    if (rooms.length === 0) {
      console.log(option + ': no available rooms.');
    }
    let ul = document.getElementById('chat_candidates');
    let div = ul.querySelector('div#' + option);
    div.innerHTML = '';

    rooms.forEach(room => {
      let index = s4();
      let liId = 'session' + index;
      let foundRoom = roomUUIDMap.find(
          roomTemp => roomTemp.roomId === room.roomId);
      if (foundRoom) {
        foundRoom.sessionId = liId;
      } else {
        roomUUIDMap.push({roomId: room.roomId, sessionId: liId});
      }
      let li = document.createElement("li");
      li.setAttribute("id", liId);
      li.style.border = '1px solid';

      let divImg = document.createElement('div');
      divImg.setAttribute("class", "image");
      let img = document.createElement('img');
      img.setAttribute("src", "/image/arrow_bottom.png");
      img.setAttribute("class", "company_img");
      divImg.appendChild(img);

      let a = document.createElement("a");
      let em = document.createElement("em");
      em.setAttribute("class", "label");
      let span = document.createElement("span");
      span.setAttribute("class", "last_text");
//      span.innerText = '어떤 내용이 궁굼하신가';
      a.appendChild(em);
      a.appendChild(span);

      let emTime = document.createElement("em");
      emTime.setAttribute("class", "chat_time");
//      emTime.innerText = "오후 4:33";

      socketClient.getLastMsg(room.roomId);

      let bot = '';
      if (room['bot'])  bot = '[chatbot 상담 중]';
      else if (room['available']) bot = '[상담사 요청]';
      else if (!room['available'] && !room['bot']) bot = '[상담중]';
      em.innerText = bot + room['csService'];

      a.addEventListener('click', () => {
        $("#gcs_title em").text(room['csService']);
        openChatWindow(room['roomId'], room['csService'], room['userId']);
      });
      li.appendChild(divImg);
      li.appendChild(a);
      li.appendChild(emTime);
      div.appendChild(li);
    });
  }

  // chat window에 과거 msg 들을 출력. (현재는 갯수 상관 없이 모두 뿌리도록 되어있음)
  function writePreviousMessages(roomId, previousMsgs) {
    clearMessages();

    if (!previousMsgs) {
      ableToStart();
      return;
    }

    let talker = '';
    previousMsgs.forEach(talkObj => {
      if (talkObj.userType === userType) {
        talker = 'me';
      } else {
        talker = 'other';
      }
      if (talkObj.userType === 'system') {
        talker = 'system';
      }
      writeMessage(roomId, talker, talkObj);
    });

    // 상담 종료로 끝나는 경우 상담 시작 버튼 노출
    if (previousMsgs.length > 0) {
      let lastMsg = previousMsgs[previousMsgs.length - 1];
      if (lastMsg.userType === 'system' && lastMsg.message === '상담이 종료되었습니다.') {
        ableToStart();
      }
    }
  }

  // '상담 시작' button 을 제공 (start 가능한 상태로 UI 변경)
  function ableToStart() {
    $('.cschat_btm').addClass('hide');

    $('.cs_talk').append(
        '<li class="each_chatout">' +
        '</li>'
    );
    $('.each_chatout').empty().append(
        '<div class="btn_fill">\n' +
        '<button type="button" class="startChat_btn">상담 시작</button>\n' +
        '</div>'
    );
    $('.each_chatout .btn_fill .startChat_btn').click(startConversation);
  }

  function clearMessages() {
    var ul = document.getElementById('chat_talk_section');
    ul.innerHTML = '';
    lastTalk = {};
  }

  function writeMessage(roomId, talker, talkObj) {
    // user: 모든 msg 가 read 상태인 것으로 판단
    socketClient.readAllMsgs(roomId);

    /* supporter 용 UI action : last msg set*/
    if (typeof userOption !== "undefined" && userOption === 'gcs') {
      var room = roomUUIDMap.find(room => room.roomId === roomId);
      let liId = room.sessionId;
      let $lastTxt = $('li#' + liId + ' span.last_text');
      let $lastTxtTime = $('li#' + liId + ' em.chat_time');
      $lastTxt.text(talkObj.message);
      $lastTxtTime.text(talkObj.time);
    }
    /* supporter 용 UI action */

    if (roomId !== curRoomId) {
      return;
    }
    let msg = talkObj.message;
    let date = talkObj.date;
    let time = talkObj.time;
    let timeDetail = talkObj.timeDetail;
    let expectedIntents = talkObj.expectedIntents;
    if (!date) {
      date = getDate();
      talkObj.date = date;
    }
    if (!time) {
      time = getTime();
      talkObj.time = time;
    }
    if (!timeDetail) {
      timeDetail = getTimeWithSecond();
      talkObj.timeDetail = timeDetail;
    }

    var ul = document.getElementById('chat_talk_section');
    var li;

    // 마지막 talk 의 date 와 현 talk 의 date 비교
    if (!lastTalk.date || lastTalk.date !== date) {
      li = createSystemMag(date);
      ul.appendChild(li);
    }
    lastTalk = talkObj;

    if (talker === 'me') {
      li = createUsrMsg(msg, time, expectedIntents);
      ul.appendChild(li);

    } else if (talker === 'other') {
      li = createBotMsg(msg, time, expectedIntents);
      ul.appendChild(li);

    } else if (talker === 'system') {
      li = createSystemMag(msg);
      ul.appendChild(li);
    }
    handleCsTalkScroll();
  }

  // maumSDS 챗봇 커스터마이징 : 답변에 a tag 있으면 button 스타일 주기
  function aTagToButton(dv_text) {
    let aTags = dv_text.getElementsByTagName('a');
    if (aTags.length > 0) {
      Array.prototype.forEach.call(aTags,
          aTag => {
            let wrapper = document.createElement('div');
            wrapper.setAttribute('class', 'btn_basic');
            aTag.parentNode.insertBefore(wrapper, aTag);
            wrapper.appendChild(aTag);
            // aTag.wrap('<div class="btn_basic"></div>')
          });
    }
  }

  // chat window 에 상대 msg UI 생성
  function createBotMsg(msg = '', time, expectedIntents) {
    let li = document.createElement("li");
    li.setAttribute("class", "bot");
    let dv_time = document.createElement("div");
    let dv_msg = document.createElement("div");
    let p_time = document.createElement("p");
    let dv_text = document.createElement("div");
    dv_msg.setAttribute("class", "message");
    dv_time.setAttribute("class", "time");
    dv_text.setAttribute("class", "text");
    p_time.setAttribute("class", "time");
    p_time.appendChild(document.createTextNode(time));
    dv_text.innerHTML = msg;
    aTagToButton(dv_text);
    dv_msg.appendChild(dv_text);
    dv_time.appendChild(p_time);
    dv_msg.appendChild(dv_time);
    li.appendChild(dv_msg);

    if (expectedIntents && expectedIntents.length > 0) {
      let dv_btn_list = document.createElement('div');
      dv_btn_list.setAttribute('class', 'btn_basic');
      expectedIntents.forEach(intent => {
        let intent_btn = document.createElement('button');
        intent_btn.addEventListener('click', () => {
          sendMessage(intent.intent);
        });
        intent_btn.append(intent.displayName);
        intent_btn.setAttribute('value', intent.intent);
        dv_btn_list.appendChild(intent_btn);
      });
      li.appendChild(dv_btn_list);
    }

    return li

    // <li class="bot">
    //  <div class="message">
    //     <div class="time">
    //      <p class="time" id="bot_start_time"> 12:20 </p>
    //     </div>
    //     <div class="text">
    //     하위 나는 여기서 일하는 봇이야 공부열심히 해야 나처럼 봇인척하는 알바 안한다
    //       <div class="btn_basic">
    //       <a href="#none">버튼2</a>
    //       </div>
    //    </div>
    // </div>
    //  <div class="btn_basic">
    //    <button type="button">버튼1</button>
    //    <button type="button">버튼2</button>
    //    <button type="button">버튼3</button>
    //  </div>
    // </li>

  }

  // chat window 에 나의 msg UI 생성
  function createUsrMsg(msg = '', time, expectedIntents) {

    let li = document.createElement("li");
    li.setAttribute("class", "user");
    let dv_time = document.createElement("div");
    let dv_msg = document.createElement("div");
    let p_time = document.createElement("p");
    let dv_text = document.createElement("div");
    dv_msg.setAttribute("class", "message");
    dv_time.setAttribute("class", "time");
    dv_text.setAttribute("class", "text");
    p_time.setAttribute("class", "time");
    p_time.appendChild(document.createTextNode(time));
    dv_text.innerHTML = msg;
    aTagToButton(dv_text);
    dv_msg.appendChild(dv_text);
    dv_time.appendChild(p_time);
    dv_msg.appendChild(dv_time);
    li.appendChild(dv_msg);

    if (expectedIntents && expectedIntents.length > 0) {
      let dv_btn_list = document.createElement('div');
      dv_btn_list.setAttribute('class', 'btn_basic');
      expectedIntents.forEach(intent => {
        if (intent.displayType !== 'B') {
          return;
        }
        let intent_btn = document.createElement('button');
        intent_btn.addEventListener('click', () => {
          sendMessage(intent.intent);
        });
        intent_btn.append(intent.displayName);
        intent_btn.setAttribute('value', intent.intent);
        dv_btn_list.appendChild(intent_btn);
      });
      li.appendChild(dv_btn_list);
    }
    return li

    // <li class="user">
    //  <div class="message">
    //     <div class="time">
    //      <p class="time" id="bot_start_time"> 12:20 </p>
    //     </div>
    //     <div class="text">
    //      사회는 그런 아픔이 있구나 명심할게
    //         <div class="btn_basic">
    //         <a href="#none">버튼2</a>
    //         </div>
    //     </div>
    //  </div>
    //   <div class="btn_basic">
    //     <button type="button">버튼1</button>
    //     <button type="button">버튼2</button>
    //     <button type="button">버튼3</button>
    //   </div>
    // </li>

  }

  // chat window 에 system msg UI 생성
  function createSystemMag(msg = '') {
    let li = document.createElement("li");
    let em = document.createElement("em");
    li.setAttribute("class", "system_entry");
    em.appendChild(document.createTextNode(msg));
    li.appendChild(em);
    return li;
    //           <li class="system_entry">
    //             <em><span>홍길동</span> 님이 입장하셨습니다.</em>
    //           </li>
  }

  // msg Input 값 받아오기
  function getInputMsg() {
    var $input = $('#user_message_input');
    var msg = $input.val();

    return msg;
  }

  // msg Input 창 clear
  function clearInputMsg() {
    var $input = $('#user_message_input');
    $input.val('');
    $input.focus();
  }

  // 채팅 스크롤 하단 유지
  function handleCsTalkScroll() {
    var $csTalk = $('.cschat_mid .cs_talk');
    $csTalk.scrollTop($csTalk[0].scrollHeight);
  }

  // 상담종료 시작부터 상담평가 완료까지의 이벤트
  function handleChatEndUI() {
    var starScoreEl = $('.score_template').html();
    var $score = '';
    var $scoretext = '';
    var coloredScore = 0;
    var index = 0;
    var $evaluation = '';

    // 상담 종료 버튼 클릭 시

    // 상담 평가를 완료하지 않으면 menu 버튼 클릭 불가능
    $('.user_menu .menu button').attr('disabled', true);

    // 평가표 open
    $('.cs_talk').append(
        '<li class="each_chatout">' +
        '<div class="supporter_evaluation">' +
        '<div class="text_box">\n' +
        '<em>\n' +
        '상담은 만족스러웠나요??\n' +
        '</em>\n' +
        '<p>\n' +
        '상담 평가를 남겨주시면 다음번 상담 시<br>\n' +
        '반영하도록 하겠습니다.\n' +
        '</p>\n' +
        '</div>\n' +
        '<div class="suggestion">\n' +
        starScoreEl +
        '\n<textarea name="evaluation" id="evaluation" cols="30" rows="3\n" placeholder="추가 의견 작성하기"></textarea>'
        +
        '<button type="submit" class="score_submit">완료</button>\n' +
        '</div>\n' +
        '</div>\n' +
        '</li>'
    );
    handleCsTalkScroll();
    scoreColoring();
    scoreSuccess();

    // dialog 상담평가 별점주기
    function scoreColoring() {
      $('.supporter_evaluation .score button').on('click', function () {
        $score = $('.supporter_evaluation .score');
        let thisScore = $(this).parent($('.score'));
        $scoretext = $score.find($('.score_text'));
        index = $score.index(thisScore);
        coloredScore = index + 1;
        actionColoring();
      });
    }

    function sessionUpdate(grade, evaluation) {
      $.ajax({
        url: '/user/service/chat/updateSession',
        type: 'POST',
        data: {grade: grade, sessionId: sessionId, evaluation: evaluation},
      });
    }

    // 평가 결과 및 상담시작 버튼 채팅창에 표시
    function scoreSuccess() {
      $('.score_submit').on('click', function () {
        $evaluation = $('#evaluation').val();
        sessionUpdate(index + 1, $evaluation);
        $('.each_chatout').empty().append(
            // '<em>상담이 종료되었습니다.</em>\n' +
            '<div class="selected_score">\n' + starScoreEl + '\n</div>' +
            '<div class="btn_fill">\n' +
            '<button type="button" class="startChat_btn">상담 시작</button>\n' +
            '</div>'
        );

        $('.each_chatout .btn_fill .startChat_btn').click(startConversation);
        $score = $('.selected_score').find('.score');
        $scoretext = $score.find($('.score_text'));
        coloredScore = index + 1;

        $scoretext.addClass('hide');
        actionColoring();

        // 상담 평가를 완료하면 menu 버튼 클릭 가능
        $('.user_menu .menu button').attr('disabled', false);
        $('.cschat_btm').addClass('hide');
      });
    }

    // 클릭한 별만큼 색칠하기
    function actionColoring() {
      $score.removeClass('on');
      $scoretext.removeClass('on');
      for (var i = 0; i < coloredScore; i++) {
        $score.eq(i).addClass('on');
      }
      $scoretext.eq(index).addClass('on');
    }
  }

  // cschat_btm user메뉴 open
  $('.cschat_btm .menu_open').on('click', function () {
    $(this).siblings('.menu').toggleClass('on');
  });

  // cschat modal button 클릭 시 dialog 오픈
  function handleCschatDialog(button, dialog) {
    button.on('click', function () {
      $('.cschat_body').addClass('backdrop');
      dialog.addClass('on');
    });

    /* close 확인 */
    dialog.find('.btn_cancel').on('click', function () {
      /* 모달 전체 close 공통 */
      $('.cschat_body').removeClass('backdrop');
      dialog.removeClass('on');
      $('.menu').removeClass('on')
    });

    /* 확인 버튼 */
    dialog.find('.btn_confirm').on('click', function () {
      /* 모달 전체 close 공통 */
      $('.cschat_body').removeClass('backdrop');
      dialog.removeClass('on');
      $('.menu').removeClass('on');
    });
  }

  handleCschatDialog($('#btn_change'), $('.dialog_change'));
  handleCschatDialog($('#btn_chatout'), $('.dialog_chatout'));

  /*채팅 textarea*/
  (function (){
    var $textarea = $('textarea[name="user_message"]')
    var chatBody = $('.cschat_mid');

    // 채팅 Input 에서 Send Icon 클릭 시
    $('#text_send').on('click', function () {
      sendMessage();
      handleChatTextAreaHeight();
    });

    /*채팅 textarea 에서 keydown 시*/
    $('.cschat_btm .user_writes textarea[name="user_message"]').keydown(
        function (e) {
          // e.preventDefault();
          var keyCode = e.which?e.which:e.keyCode;

          var chatInputScrollHeight = $textarea.css({'height' : 0 + 'px'}).prop('scrollHeight');
          console.log('chat')

          if ( e.shiftKey === true && keyCode == 13 ) {
            e.preventDefault();

            //shift enter를 한 위치
            var cursorPosition = $textarea.prop('selectionStart')
            var content = $textarea.val()

            //내용 중간에 뉴라인 삽입
            $textarea.val(content.substr(0,cursorPosition)+"\n"+content.substr(cursorPosition))

            //뉴라인 적용 후 커서 위치 이동
            $textarea.prop('selectionStart', cursorPosition+1)
            $textarea.prop('selectionEnd', cursorPosition+1)

            //textarea 스크롤 하단유지
            $textarea.prop("scrollTop", $textarea.prop("scrollTop") + 22)
          } else if ( keyCode == 13 ) {
            e.preventDefault();

            var thisHeight = $(this).css('height').replace('px', '');
            var cschatMid = $('.cschat_mid');
            var cschatMidHeight = cschatMid.css('margin-bottom').replace(
                'px', '');

            sendMessage();
          }

          handleChatTextAreaHeight();
        }
    );

    function handleChatTextAreaHeight() {
      var chatInputScrollHeight = $textarea.css({'height' : 0 + 'px'}).prop('scrollHeight');

      if(chatInputScrollHeight > 120) {
        chatInputScrollHeight = 120
      }

      var calcChatInputHeight = ( chatInputScrollHeight + 5 ) ;
      var calcChatBodymgbottom = ( chatInputScrollHeight + 20 );

      $textarea.css({'height' : calcChatInputHeight + 'px'})
      chatBody.css({'margin-bottom' : calcChatBodymgbottom + 'px' });

      // console.log(chatInputScrollHeight)
    }
  })();

  function sendMessage(msg = '') {
    if (msg === '') {
      msg = getInputMsg();
    }

    if (msg !== '') {
      writeMessage(curRoomId, 'me', {message: msg});
      socketClient.send2Server(curRoomId, msg);
      clearInputMsg();
    }
  }
});

/* Global functions */

function getDate() {
  let today = new Date();
  let year = today.getFullYear(); // 년도
  let month = today.getMonth() + 1;  // 월
  let date = today.getDate();  // 날짜
  let day = today.getDay();  // 요일
  let day_han = new Array('일', '월', '화', '수', '목', '금', '토');
  let res = year + '년 ' + month + '월 ' + date + '일 ' + day_han[day] + '요일';
  return res;
}

function getTime() {
  let today = new Date();
  let time = today.getHours().toString().padStart(2, '0')
      + ":" + today.getMinutes().toString().padStart(2, '0');
  return time;
}

function getTimeWithSecond() {
  let today = new Date();
  let time = today.getHours().toString().padStart(2, '0')
      + ":" + today.getMinutes().toString().padStart(2, '0')
      + ":" + today.getSeconds().toString().padStart(2, '0');
  return time;
}

function s4() {
  return ((1 + Math.random()) * 0x10000 | 0).toString(16).substring(1);
}
